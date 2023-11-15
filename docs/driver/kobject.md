# kobject 对象

kobject 是组成设备模型的基本结构, 最初可以理解为一个简单的计数器，但现在 kobject 能处理的任务和支持的代码已经不仅仅是作为计数器

当前 kobject 结构所能处理的任务和它支持的代码:

1. 对象的引用计数器

当内核对象被创建时, 通过使用引用计数器来跟踪对象生命周期, 在没有代码持有该对象的引用时, 该对象结束自己的有效生命周期, 并且可以删除

2. sysfs 表述

在 sysfs 中显示的每一个对象, 都对应一个 kobject, 它被用来与内核交互并创建它的可见表述

3. 数据结构关联

设备模型是一个友好而复杂的数据结构, 通过在其间的大量连接而构成一个多层次的体系结构, kobject 实现了该结构并把它们聚合在一起

4. 热插拔事件处理

当系统中的硬件被热插拔时, 在 kobject 子系统控制下, 将产生事件以通知用户空间


## kobject 初始化

1. 对 kobject 清零

通常调用 memset 函数设置为 0, 如果忘记对 kobject 的清零初始化, 则在以后使用 kobject 时, 可能会发生一些奇怪的错误(因为此时 kobject 对象可能是随机数据, 里面涉及到的诸如引用计数的值会不正确)

2. 调用 kobject_init() 函数初始设置结构内部的一些成员

```c
void kobject_init(struct kobject *kobj);
```

这里, 引用设置引用计数为1


## 对引用计数的操作

kobject 的一个重要作用是作为引用计数, 可以通过如下函数设置应用计数器的值

```c
struct kobject *kobject_get(struct kobject *kobj);
```

该函数用于增加 kobject 的引用计数, 调用成功, 则增加 kobject 的引用计数, 并返回指向 kobject 的指针, 否则返回 NULL, 必须检查返回值, 否则可能会产生麻烦的竞态

```c
void kobject_put(struct kobject *kobj);
```

该函数用于减少 kobject 的引用计数, 调用成功, 则减少 kobject 的引用计数, 并在可能的情况下释放该对象, kobject_init() 函数初始化时, 将 kobject 的引用计数设置为1, 所以至少需要调用一次 kobject_put 来释放该 kobject 对象
