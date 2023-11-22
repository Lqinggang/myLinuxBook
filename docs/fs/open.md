# open 函数与VFS

[open 系统调用](../interrupt/open_syscall.md)对应的服务例程为 sys_open()  函数(即应用层的 open 函数通过系统调用的方式最终会调用sys_open 函数), 该函数定义如下

```c
static __attribute__((unused))
int sys_open(const char *path, int flags, mode_t mode);
```

| 参数 |  说明 |
| ---- | ---- |
| path | 要打开的文件的路径名 |
| flags | 访问模式标志 |
| mode  | 文件被创建时需要的许可权限掩码 |

该系统调用成功则返回一个文件描述符, 也就是指向文件对象的指针数组 current->files->fd 中分配给新文件的索引，否则，返回 -1
