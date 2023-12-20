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

### do\_syscall\_64 与 do\_syscall\_x64

如上, 在执行 syscall 之后, 最终会在 `arch/x86/entry/entry_64.S`中通过`call do_syscall_64`执行 do_syscall_64 函数, 而该函数中将调用 do_syscall_x64 函数去执行系统调用回调函数

### sys\_call\_table

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
如上, 是打开一个文件时, 需要调用的函数, 其中, filename 是一个文件名, 即实际就是打开一个文件的时候, 通过 get_unused_fd_flags 从当前进程的进程描述符中的文件描述符表中找到可用的文件描述符, 然后将该[文件描述符](../fs/commonfs.md)和打开的文件对象进行关联

## open 函数与进程

```c
int __get_unused_fd_flags(unsigned flags, unsigned long nofile)
{
    return alloc_fd(0, nofile, flags);
}

int get_unused_fd_flags(unsigned flags)
{
    return __get_unused_fd_flags(flags, rlimit(RLIMIT_NOFILE));
}
EXPORT_SYMBOL(get_unused_fd_flags);

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

### do\_filp\_open 

```c
struct file *do_filp_open(int dfd, struct filename *pathname,
        const struct open_flags *op) 
{
    struct nameidata nd;
    int flags = op->lookup_flags;
    struct file *filp;

    set_nameidata(&nd, dfd, pathname, NULL);
    filp = path_openat(&nd, op, flags | LOOKUP_RCU);
    if (unlikely(filp == ERR_PTR(-ECHILD)))
        filp = path_openat(&nd, op, flags);
    if (unlikely(filp == ERR_PTR(-ESTALE)))
        filp = path_openat(&nd, op, flags | LOOKUP_REVAL);
    restore_nameidata();
    return filp;
}
```
在 do_sys_openat2 函数中, 通过 do_filp_open 打开一个文件对象, 其实现如上

### path\_openat

```c
static struct file *path_openat(struct nameidata *nd,
            const struct open_flags *op, unsigned flags)
{
    struct file *file;
    int error;

    file = alloc_empty_file(op->open_flag, current_cred());
    if (IS_ERR(file))
        return file;

    if (unlikely(file->f_flags & __O_TMPFILE)) {
        error = do_tmpfile(nd, flags, op, file);
    } else if (unlikely(file->f_flags & O_PATH)) {
        error = do_o_path(nd, flags, file);
    } else {
        const char *s = path_init(nd, flags);
        while (!(error = link_path_walk(s, nd)) &&
               (s = open_last_lookups(nd, file, op)) != NULL)
            ;
        if (!error)
            error = do_open(nd, file, op);
        terminate_walk(nd);
    }
    if (likely(!error)) {
        if (likely(file->f_mode & FMODE_OPENED))
            return file;
        WARN_ON(1);
        error = -EINVAL; 
    }
    fput(file);
    if (error == -EOPENSTALE) {
        if (flags & LOOKUP_RCU) 
            error = -ECHILD;
        else
            error = -ESTALE;
    }
    return ERR_PTR(error);
}
```

如上, 打开一个文件对象的时候, 首先通过 alloc_empty_file 分配一个空的文件对象, 之后, 根据打开的文件的类型, 调用不同的设备, 对于临时文件, 调用 do_tmpfile 函数, 对于目录, 调用 do_o_path 函数， 其他的文件将调用 do_open 打开

### do_open

```c
/*
 * Handle the last step of open()
 */
static int do_open(struct nameidata *nd,
           struct file *file, const struct open_flags *op)
{
    ...
    error = may_open(idmap, &nd->path, acc_mode, open_flag);
    if (!error && !(file->f_mode & FMODE_OPENED))
        error = vfs_open(&nd->path, file);
    ...

    return error;
}
```

如上, 在进行一系列检查之后, 将通过 vfs_open 打开文件


### vfs_open

```c
/**
 * vfs_open - open the file at the given path
 * @path: path to open
 * @file: newly allocated file with f_flag initialized
 */
int vfs_open(const struct path *path, struct file *file)
{
    file->f_path = *path;
    return do_dentry_open(file, d_backing_inode(path->dentry), NULL);
}
```

### do_dentry_open

```c
static int do_dentry_open(struct file *f,
              struct inode *inode,
              int (*open)(struct inode *, struct file *))
{
    static const struct file_operations empty_fops = {};
    int error;

    path_get(&f->f_path);
    f->f_inode = inode;
    f->f_mapping = inode->i_mapping;
    f->f_wb_err = filemap_sample_wb_err(f->f_mapping);
    f->f_sb_err = file_sample_sb_err(f);

    if (unlikely(f->f_flags & O_PATH)) {
        f->f_mode = FMODE_PATH | FMODE_OPENED;
        f->f_op = &empty_fops;
        return 0;
    }

    if ((f->f_mode & (FMODE_READ | FMODE_WRITE)) == FMODE_READ) {
        i_readcount_inc(inode);
    } else if (f->f_mode & FMODE_WRITE && !special_file(inode->i_mode)) {
        error = get_write_access(inode);
        if (unlikely(error))
            goto cleanup_file;
        error = __mnt_want_write(f->f_path.mnt);
        if (unlikely(error)) {
            put_write_access(inode);
            goto cleanup_file;
        }
        f->f_mode |= FMODE_WRITER;
    }

    /* POSIX.1-2008/SUSv4 Section XSI 2.9.7 */
    if (S_ISREG(inode->i_mode) || S_ISDIR(inode->i_mode))
        f->f_mode |= FMODE_ATOMIC_POS;

    f->f_op = fops_get(inode->i_fop);
    if (WARN_ON(!f->f_op)) {
        error = -ENODEV;
        goto cleanup_all;
    }
    error = security_file_open(f);
    if (error)
        goto cleanup_all;

    error = break_lease(file_inode(f), f->f_flags);
    if (error)
        goto cleanup_all;

    /* normally all 3 are set; ->open() can clear them if needed */
    f->f_mode |= FMODE_LSEEK | FMODE_PREAD | FMODE_PWRITE;
    if (!open)
        open = f->f_op->open;
    if (open) {
        error = open(inode, f);
        if (error)
            goto cleanup_all;
    }
    f->f_mode |= FMODE_OPENED;
    if ((f->f_mode & FMODE_READ) &&
         likely(f->f_op->read || f->f_op->read_iter))
        f->f_mode |= FMODE_CAN_READ;
    if ((f->f_mode & FMODE_WRITE) &&
         likely(f->f_op->write || f->f_op->write_iter))
        f->f_mode |= FMODE_CAN_WRITE;
    if ((f->f_mode & FMODE_LSEEK) && !f->f_op->llseek)
        f->f_mode &= ~FMODE_LSEEK;
    if (f->f_mapping->a_ops && f->f_mapping->a_ops->direct_IO)
        f->f_mode |= FMODE_CAN_ODIRECT;

    f->f_flags &= ~(O_CREAT | O_EXCL | O_NOCTTY | O_TRUNC);
    f->f_iocb_flags = iocb_flags(f);

    file_ra_state_init(&f->f_ra, f->f_mapping->host->i_mapping);

    if ((f->f_flags & O_DIRECT) && !(f->f_mode & FMODE_CAN_ODIRECT))
        return -EINVAL;
    /*
     * XXX: Huge page cache doesn't support writing yet. Drop all page
     * cache for this file before processing writes.
     */
    if (f->f_mode & FMODE_WRITE) {
        /*
         * Paired with smp_mb() in collapse_file() to ensure nr_thps
         * is up to date and the update to i_writecount by
         * get_write_access() is visible. Ensures subsequent insertion
         * of THPs into the page cache will fail.
         */
        smp_mb();
        if (filemap_nr_thps(inode->i_mapping)) {
            struct address_space *mapping = inode->i_mapping;

            filemap_invalidate_lock(inode->i_mapping);
            /*
             * unmap_mapping_range just need to be called once
             * here, because the private pages is not need to be
             * unmapped mapping (e.g. data segment of dynamic
             * shared libraries here).
             */
            unmap_mapping_range(mapping, 0, 0, 0);
            truncate_inode_pages(mapping, 0);
            filemap_invalidate_unlock(inode->i_mapping);
        }
    }

    /*
     * Once we return a file with FMODE_OPENED, __fput() will call
     * fsnotify_close(), so we need fsnotify_open() here for symmetry.
     */
    fsnotify_open(f);
    return 0;

cleanup_all:
    if (WARN_ON_ONCE(error > 0))
        error = -EINVAL;
    fops_put(f->f_op);
    put_file_access(f);
cleanup_file:
    path_put(&f->f_path);
    f->f_path.mnt = NULL;
    f->f_path.dentry = NULL;
    f->f_inode = NULL;
    return error;
}
```
如上, 是在调用指定文件的open函数的处理过程

```c
    f->f_op = fops_get(inode->i_fop);
```
其中, 如上是获取与[文件索引对象](../fs/commonfs.md#inode)的文件操作表, 正如[字符设备驱动介绍](../driver/cdev/cdev_details.md)一样，对于字符设备, 其通过 init_special_inode  函数在打开一个字符设备时，根据打开标志是字符设备, 则将[文件索引对象](../fs/commonfs.md#inode)的文件操作表设置为 def_chr_fops, 这里通过 fops_get 获取到的就是 def_chr_fops

```c
    if (!open)
        open = f->f_op->open;
    if (open) {
        error = open(inode, f);
        if (error)
            goto cleanup_all;
    }
```
如上, 在获取到文件索引对象关联的文件操作表之后, 通过关联的文件操作表打开文件, 对于字符设备, 在[字符设备驱动介绍](../driver/cdev/cdev_details.md)一节中, 可以看到对应的是 chrdev_open 函数, 至此, VFS 将转到通过字符设备的 open 函数打开字符设备

## open 函数与设备驱动

这里以字符设备驱动为例, 在[字符设备驱动介绍](../driver/cdev/cdev_details.md#chrdev_open)一节中，已经介绍过 chrdev_open 函数， 这里不再重复介绍
