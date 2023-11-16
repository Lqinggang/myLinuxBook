# kobject 对象


## kobject 基础知识

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

## kobject 对象

```c
struct kobject {
    const char      *name;
    struct list_head    entry;
    struct kobject      *parent;
    struct kset     *kset;
    struct kobj_type    *ktype;
    struct kernfs_node  *sd; /* sysfs directory entry */
    struct kref     kref;
#ifdef CONFIG_DEBUG_KOBJECT_RELEASE
    struct delayed_work release;
#endif
    unsigned int state_initialized:1;
    unsigned int state_in_sysfs:1;
    unsigned int state_add_uevent_sent:1;
    unsigned int state_remove_uevent_sent:1;
    unsigned int uevent_suppress:1;
};
```

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


## kobject 的释放

kobject 的引用计数变为0是不可预知的, 则释放 kobject 的时间也是不可预知的, 为了解决这个问题， 当 kobject 的最后一个引用计数不再存在的时候, 必须通过使用 kobject 的 release 方法异步地通知要释放 kobject

每个 kobject 都必须有一个 release 方法, 并且 kobject 在该方法被调用前必须保持不变

release 方法并不包含在 kobject 自身内(不然释放的时候就不正确), kobject 包含在称为 ktype 的 kobj_type 数据结构中, 每个 kobject 都需要一个相应的 kobj_type 结构

```c
struct kobj_type {
    void (*relese)(struct kobject *);
    struct sysfs_ops *sysfs_ops;
    struct attribute *default_attrs;
};
```

在 kobject 结构中, ktype 成员变量保存 kobj_type 的指针， 对于 kset 数据结构, 可以通过

```c
struct kobj_type *get_ktype(struct kobject *kobj);
```

函数查找制定 kobject 对应的 kobj_type 指针
