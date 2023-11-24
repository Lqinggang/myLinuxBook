#  从用户层说起之 open 函数

以下基于 Linux 6.6 内核 `_x86_64_` 架构介绍, 在 <<深入理解Linux内核>> 中 Linux 版本为 2.6.11, 在源码上由较大出入, 以下说明是笔者结合书中介绍的内容, 对 Linux 6.6 版本做的分析, 不一定准确, 不过原理上应该差距不大，基本原理应该都是如下(不过还没有找到相关处理逻辑在哪里, 待证实):

1. 用户层调用某些包含系统调用的函数(`man 2`中的函数)，触发中断

2. 根据中断号, 查找中断向量表, 找到中断号对应的中断处理函数(这里是系统调用函数, 中断号应该是`0x80`)

3. 执行系统调用中断处理函数, 从寄存器(对于`i386`应该是`eax`寄存器, 对于`_x86_64_`应该是`rax`寄存器, 其他架构的具体分析)中获取对应的系统调用号以及对应的参数(对于`i386`参数存放寄存器为: `ebx`, `ecx`, `edx`, `esi`, `edi`, 对于`_x86_64_`参数存放寄存器为`rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`, 参数更多的话就需要用到堆栈了)

4. 执行系统调用号对应的系统调用函数

5. 从进程描述符中找到对应的打开的设备

6. 从打开的设备中获取对应的文件操作表

7. 执行打开设备对应文件操作表中的 open 回调函数

8. 依次返回结果, 最后将结果保存在`eax`或者`rax`寄存器中

9. 返回`eax`或`rax`寄存器中的值

10. 应用层 open 返回结果

::: tip 提示
这个过程涉及到进程(需要知道进程中打开的文件对象数组, 应用层 open 返回的结果是这个文件对象数组下标), 中断(系统调用基于软中断), VFS(通用文件模型, 文件操作相关), 设备驱动(最后 open 函数执行的实际 open 函数)
:::

::: danger 懵逼
应该是这样子没错啊, 为啥6.6内核看不出来呢, 搞错了?
:::

## open 函数

如下，是提供给用户层的`open`函数, 在用户层应用中, 我们将调用该函数

```c
int open(const char *pathname, int flags, mode_t mode);
```

| 参数 |  说明 |
| ---- | ---- |
| path | 要打开的文件的路径名 |
| flags | 访问模式标志 |
| mode  | 文件被创建时需要的许可权限掩码 |


## open 与系统调用

在应用层应用调用 open 函数时, 将通过中断的方式触发[系统调用](../interrupt/syscall.md), 执行系统调用号对应的处理函数并返回结果


```c
static __attribute__((unused))
int sys_open(const char *path, int flags, mode_t mode)
{
#ifdef __NR_openat
    return my_syscall4(__NR_openat, AT_FDCWD, path, flags, mode);
#elif defined(__NR_open)
    return my_syscall3(__NR_open, path, flags, mode);
#else
    return -ENOSYS;
#endif
}
```

如上, open 函数将`__NR_open`系统调用号, 以及应用层传递下来的参数作为参数调用 my_syscall3 函数, 其定义如下:


```c
#define my_syscall3(num, arg1, arg2, arg3)                                    \
({                                                                            \
    long _ret;                                                            \
    register long _num  __asm__ ("rax") = (num);                          \
    register long _arg1 __asm__ ("rdi") = (long)(arg1);                   \
    register long _arg2 __asm__ ("rsi") = (long)(arg2);                   \
    register long _arg3 __asm__ ("rdx") = (long)(arg3);                   \
                                          \
    __asm__ volatile (                                                    \
        "syscall\n"                                                   \
        : "=a"(_ret)                                                  \
        : "r"(_arg1), "r"(_arg2), "r"(_arg3),                         \
          "0"(_num)                                                   \
        : "rcx", "r11", "memory", "cc"                                \
    );                                                                    \
    _ret;                                                                 \
})
```

如上， 执行`syscall` 触发系统调用中断, 其中, `rax`寄存器保存系统调用号 num 的值, 然后将作为入参传递给[中断向量表](../interrupt/README.md)中系统调用中断对应的处理函数，该中断处理函数将从`rax`寄存器中读取入参, 根据入参得到系统调用号, 并依次调用对应的系统调用函数，而`rdi`, `rsi`, `rdx` 这三个寄存器的值, 将作为系统调用函数的参数

### do_syscall_64 与 do_syscall_x64

如上, 在执行 syscall 之后, 最终会在 `arch/x86/entry/entry_64.S`中通过`call do_syscall_64`执行 do_syscall_64 函数, 而该函数中将调用 do_syscall_x64 函数去执行系统调用回调函数

### sys_call_table

在 do_syscall_x64 函数中, 将以传入的系统调用号(通过`rax`寄存器)为 `sys_call_table` 数组的下标, 然后执行对应的系统调用回调函数

正如[系统调用分派表](../interrupt/syscall.md)中描述的那样子, `sys_call_table`在`arch/x86/entry/syscall_64.c`中定义, 并且在编译的时候会自动展开, 将执行如下函数


```c
long do_sys_open(int dfd, const char __user *filename, int flags, umode_t mode)
{
    struct open_how how = build_open_how(flags, mode); /* 创建打开文件的模式 */
    return do_sys_openat2(dfd, filename, &how);
}

SYSCALL_DEFINE3(open, const char __user *, filename, int, flags, umode_t, mode)
{
    if (force_o_largefile())
        flags |= O_LARGEFILE;
    return do_sys_open(AT_FDCWD, filename, flags, mode);
}
```

### 文件对象以及文件描述符

```c
static long do_sys_openat2(int dfd, const char __user *filename,
               struct open_how *how)
{
    struct open_flags op;
    int fd = build_open_flags(how, &op);
    struct filename *tmp;

    if (fd)
        return fd;

    tmp = getname(filename);
    if (IS_ERR(tmp))
        return PTR_ERR(tmp);

    fd = get_unused_fd_flags(how->flags);
    if (fd >= 0) {
        struct file *f = do_filp_open(dfd, tmp, &op);
        if (IS_ERR(f)) {
            put_unused_fd(fd);
            fd = PTR_ERR(f);
        } else {
            fd_install(fd, f);
        }
    }
    putname(tmp);
    return fd;
}
```

## open 函数与进程

```c
/*
 * allocate a file descriptor, mark it busy.
 */
static int alloc_fd(unsigned start, unsigned end, unsigned flags)
{
    struct files_struct *files = current->files;
    unsigned int fd;
    int error;
    struct fdtable *fdt;

    spin_lock(&files->file_lock);
repeat:
    fdt = files_fdtable(files);
    fd = start;
    if (fd < files->next_fd)
        fd = files->next_fd;

    if (fd < fdt->max_fds)
        fd = find_next_fd(fdt, fd);

    /*
     * N.B. For clone tasks sharing a files structure, this test
     * will limit the total number of files that can be opened.
     */
    error = -EMFILE;
    if (fd >= end)
        goto out;

    error = expand_files(files, fd);
    if (error < 0)
        goto out;

    /*
     * If we needed to expand the fs array we
     * might have blocked - try again.
     */
    if (error)
        goto repeat;

    if (start <= files->next_fd)
        files->next_fd = fd + 1;

    __set_open_fd(fd, fdt);
    if (flags & O_CLOEXEC)
        __set_close_on_exec(fd, fdt);
    else
        __clear_close_on_exec(fd, fdt);
    error = fd;
#if 1
    /* Sanity check */
    if (rcu_access_pointer(fdt->fd[fd]) != NULL) {
        printk(KERN_WARNING "alloc_fd: slot %d not NULL!\n", fd);
        rcu_assign_pointer(fdt->fd[fd], NULL);
    }
#endif

out:
    spin_unlock(&files->file_lock);
    return error;
}

int __get_unused_fd_flags(unsigned flags, unsigned long nofile)
{
    return alloc_fd(0, nofile, flags);
}
```

如上, ` struct files_struct *files = current->files;`  即使用当前进程的文件对象, `task_struct`结构体中的`files`用于表示当前打开的文件信息, 其中包含了一个`struct file`类型的文件对象数组`fd_array`

`fd_array`这个数组大小只有64, 当一个进程打开的文件数量小于64时, 用这个数组存放打开的文件对象就可以了, 否则需要使用`struct files_struct`结构体中的`struct fdtable fdtab`中的`fd`来存放打开的文件, 其实一开始`struct files_struct`结构体中的`fdt`指向的是`fdtab`, 而`fdtab.fd`初始指向的是`fd_array`, 当`fd_array`不足以表示打开的文件时, `struct fdtable` 中的`fd`才会重新分派, 初始如下:

```c
struct files_struct init_files = {
    .count      = ATOMIC_INIT(1),
    .fdt        = &init_files.fdtab,
    .fdtab      = {
        .max_fds    = NR_OPEN_DEFAULT,
        .fd     = &init_files.fd_array[0],
        .close_on_exec  = init_files.close_on_exec_init,
        .open_fds   = init_files.open_fds_init,
        .full_fds_bits  = init_files.full_fds_bits_init,
    },
    .file_lock  = __SPIN_LOCK_UNLOCKED(init_files.file_lock),
    .resize_wait    = __WAIT_QUEUE_HEAD_INITIALIZER(init_files.resize_wait),
};
```

## open 函数与虚拟文件系统


## open 函数与设备驱动


