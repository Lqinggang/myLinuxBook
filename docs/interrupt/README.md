# 中断和异常

## 中断向量表

```c
asmlinkage const sys_call_ptr_t sys_call_table[__NR_syscall_max+1] = {
    /*
     * Smells like a compiler bug -- it doesn't work
     * when the & below is removed.
     */
    [0 ... __NR_syscall_max] = &__x64_sys_ni_syscall,
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

