# 系统调用

系统调用时通过软中断向内核发起一个明确的请求, 通过向内核发起系统调用实现用户态进程和硬件设置间的大部分接口, 系统调用属于内核


## 系统调用分派表

为了把系统调用号与对应的服务例程关联起来，内核利用了一个系统调用分派表，这个表存放在 sys_call_table 数组中, 如下(以_x86_64_为例)

```c
asmlinkage const sys_call_ptr_t sys_call_table[__NR_syscall_max+1] = {
    /*
     * Smells like a compiler bug -- it doesn't work
     * when the & below is removed.
     */
    [0 ... __NR_syscall_max] = &__x64_sys_ni_syscall, /* 这里的意思是 [0 - __NR_syscall_max] 下标的数据全部初始化为 &__x64_sys_ni_syscall */
#include <asm/syscalls_64.h>
};
```

其中, asm/syscalls_64.h 文件在编译时生成, 生成前内容如下:

```text
__SYSCALL_COMMON(0, sys_read)
__SYSCALL_COMMON(1, sys_write)
__SYSCALL_COMMON(2, sys_open)
__SYSCALL_COMMON(3, sys_close)
...
```

生成之后, 内容如下:
```
[0] = sys_read,
[1] = sys_write,
[2] = sys_open,
[3] = sys_close,
...
```

生成之后的系统调用分派表中第 n 个表项包含系统调用号为 n 的服务例程的地址, 如系统调用号 2 对应的是 sys_open 函数,  `__x64_sys_ni_syscall`是"未实现"系统调用的服务例程, 它返回出错码 -ENOSYS, 所有未实现的系统调用都执行该函数


## 进入系统调用

本地应用可以通过两种不同的方式进入系统调用:

### 执行 int $0x80 (__i386__结构) / syscall (_x86_64_架构)汇编指令

这里的 `0x80` 对应的是中断向量表中第 0x80 中断号, 它对应的是 system_call

```asm
#define my_syscall3(num, arg1, arg2, arg3)                                    \
({                                                                            \
    long _ret;                                                            \
    register long _num asm("eax") = (num);                                \
    register long _arg1 asm("ebx") = (long)(arg1);                        \
    register long _arg2 asm("ecx") = (long)(arg2);                        \
    register long _arg3 asm("edx") = (long)(arg3);                        \
                                          \
    asm volatile (                                                        \
        "int $0x80\n"                                                 \
        : "=a" (_ret)                                                 \
        : "r"(_arg1), "r"(_arg2), "r"(_arg3),                         \
          "0"(_num)                                                   \
        : "memory", "cc"                                              \
    );                                                                    \
    _ret;                                                                 \
})
```

如上, 执行`int $0x80` 触发系统调用, 其中, `eax`寄存器保存系统调用号 num 的值, 然后将作为入参传递给 0x80 号中断对应的处理函数 system_call，system_call 函数将从`eax`寄存器中读取入参, 根据入参得到系统调用号, 并依次调用对应的系统调用函数，而`ebx`, `ecx`, `edx` 这三个寄存器的值, 将作为系统调用函数的参数


### 执行 sysenter 汇编指令
