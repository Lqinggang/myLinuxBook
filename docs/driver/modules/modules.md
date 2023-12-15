# Linux 设备驱动相关组件

## kobject 对象

### kobject 基础知识

<div id="kobject"/>
kobject 是组成设备模型的基本结构, 最初可以理解为一个简单的计数器，但现在 kobject 能处理的任务和支持的代码已经不仅仅是作为计数器

当前 kobject 结构所能处理的任务和它支持的代码:

1. 对象的引用计数器

当内核对象被创建时, 通过使用引用计数器来跟踪对象生命周期, 在没有代码持有该对象的引用时, 该对象结束自己的有效生命周期, 并且可以删除

2. sysfs 表述

在 [sysfs 文件系统](../../fs/specialfs.md#sysfs)中显示的每一个对象, 都对应一个 kobject, 它被用来与内核交互并创建它的可见表述

3. 数据结构关联

设备模型是一个友好而复杂的数据结构, 通过在其间的大量连接而构成一个多层次的体系结构, kobject 实现了该结构并把它们聚合在一起

4. 热插拔事件处理

当系统中的硬件被热插拔时, 在 kobject 子系统控制下, 将产生事件以通知用户空间

### kset 对象

```c
/**
 * struct kset - a set of kobjects of a specific type, belonging to a specific subsystem.
 *
 * A kset defines a group of kobjects.  They can be individually
 * different "types" but overall these kobjects all want to be grouped
 * together and operated on in the same manner.  ksets are used to
 * define the attribute callbacks and other common events that happen to
 * a kobject.
 *
 * @list: the list of all kobjects for this kset
 * @list_lock: a lock for iterating over the kobjects
 * @kobj: the embedded kobject for this kset (recursion, isn't it fun...)
 * @uevent_ops: the set of uevent operations for this kset.  These are
 * called whenever a kobject has something happen to it so that the kset
 * can add new environment variables, or filter out the uevents if so
 * desired.
 */
struct kset {
    struct list_head list;
    spinlock_t list_lock;
    struct kobject kobj;
    const struct kset_uevent_ops *uevent_ops;
} __randomize_layout;
```

### kobject 对象

```c
struct kobject {
    const char      *name;
    struct list_head    entry;
    struct kobject      *parent;
    struct kset     *kset;
    struct kobj_type    *ktype;
    struct kernfs_node  *sd; /* sysfs directory entry */
    struct kref     kref;
##ifdef CONFIG_DEBUG_KOBJECT_RELEASE
    struct delayed_work release;
##endif
    unsigned int state_initialized:1;
    unsigned int state_in_sysfs:1;
    unsigned int state_add_uevent_sent:1;
    unsigned int state_remove_uevent_sent:1;
    unsigned int uevent_suppress:1;
};
```

### kobject 初始化

1. 对 kobject 清零

通常调用 memset 函数设置为 0, 如果忘记对 kobject 的清零初始化, 则在以后使用 kobject 时, 可能会发生一些奇怪的错误(因为此时 kobject 对象可能是随机数据, 里面涉及到的诸如引用计数的值会不正确)

2. 调用 kobject_init() 函数初始设置结构内部的一些成员

```c
void kobject_init(struct kobject *kobj);
```

这里, 引用设置引用计数为1


### 对引用计数的操作

kobject 的一个重要作用是作为引用计数, 可以通过如下函数设置应用计数器的值

```c
struct kobject *kobject_get(struct kobject *kobj);
```

该函数用于增加 kobject 的引用计数, 调用成功, 则增加 kobject 的引用计数, 并返回指向 kobject 的指针, 否则返回 NULL, 必须检查返回值, 否则可能会产生麻烦的竞态

```c
void kobject_put(struct kobject *kobj);
```

该函数用于减少 kobject 的引用计数, 调用成功, 则减少 kobject 的引用计数, 并在可能的情况下释放该对象, kobject_init() 函数初始化时, 将 kobject 的引用计数设置为1, 所以至少需要调用一次 kobject_put 来释放该 kobject 对象


### kobject 的释放

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

函数查找指定 kobject 对应的 kobj_type 指针


<div id="bus_type"/>

## Linux 总线对象

为了确保计算机能够正常工作, 必须提供数据通路, 让信息在连接到个人计算机的CPU、RAM和I/O设备之间流动，这些数据通路总称为总线

所有计算机都拥有一条系统总线，它连接大部分内部硬件设备, 在[Linux 设备模型](../model.md)中所有的设备都通过总线相连

总线将设备和驱动绑定, 系统每注册一个设备的时候, 会寻找与之匹配的驱动, 相反的, 系统每注册一个驱动的时候，会需找与之匹配而的设备, 而这里的匹配就是由总线完成的


### 总线对象

```c
struct bus_type {
    const char      *name;
    const char      *dev_name;
    struct device       *dev_root;
    const struct attribute_group **bus_groups;
    const struct attribute_group **dev_groups;
    const struct attribute_group **drv_groups;

    int (*match)(struct device *dev, struct device_driver *drv);
    int (*uevent)(struct device *dev, struct kobj_uevent_env *env);
    int (*probe)(struct device *dev);
    void (*sync_state)(struct device *dev);
    int (*remove)(struct device *dev);
    void (*shutdown)(struct device *dev);

    int (*online)(struct device *dev);
    int (*offline)(struct device *dev);

    int (*suspend)(struct device *dev, pm_message_t state);
    int (*resume)(struct device *dev);

    int (*num_vf)(struct device *dev);

    int (*dma_configure)(struct device *dev);

    const struct dev_pm_ops *pm;

    const struct iommu_ops *iommu_ops;

    struct subsys_private *p;
    struct lock_class_key lock_key;

    bool need_parent_lock;
};
```
| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| name       | 总线类型名称                                        |
| match      | 检验给定的设备驱动程序是否支持特有设备的方法, 当一总线上的新设备或者新驱动被添加时, 会一次或多次调用这个函数, 当指定的驱动程序能够处理指定设备时, 返回非零值 |
| hotplug    | 在用户空间产生热插拔事件前, 这个方法运行总线添加环境变量, 其参数与 kset 的 kotplug 方法相同 |


### 总线注册与删除

对于新的总线, 必须调用 bus_register 进行注册, 注册成功后, 在/sys/bus/目录下将看到注册之后的总线, 之后即可向这个总线添加设备

```c
int bus_register(struct bus_type *bus);
```

示例:

```c
struct bus_type ldd_bus_type = {
    .name = "ldd",
    .match = ldd_match,
    .hotplug = ldd_hotplug,
};

ret = bus_register(&ldd_bus_type);
if (ret)
{
    return ret;
}

```

当需要删除一个总线的时候, 可以通过 bus_unregister 函数删除

```c
void bus_unregister(struct bus_type *bus);
```

### 总线属性


```c
struct bus_attribute {
    struct attribute    attr;
    ssize_t (*show)(struct bus_type *bus, char *buf);
    ssize_t (*store)(struct bus_type *bus, const char *buf, size_t count);
};
```


<div id="class"/>

## Linux 类对象

类是一个设备的高层视图, 它抽象了底层的实现细节, 几乎所有的类对象都属于与 /sys/class 目录相对应的 class_subsys 子系统

```c
struct class {
    const char      *name;
    struct module       *owner;

    const struct attribute_group    **class_groups;
    const struct attribute_group    **dev_groups;
    struct kobject          *dev_kobj;

    int (*dev_uevent)(struct device *dev, struct kobj_uevent_env *env);
    char *(*devnode)(struct device *dev, umode_t *mode);

    void (*class_release)(struct class *class);
    void (*dev_release)(struct device *dev);

    int (*shutdown_pre)(struct device *dev);

    const struct kobj_ns_type_operations *ns_type;
    const void *(*namespace)(struct device *dev);

    void (*get_ownership)(struct device *dev, kuid_t *uid, kgid_t *gid);

    const struct dev_pm_ops *pm;

    struct subsys_private *p;
};
```


### 类对象的注册和销毁

```c
int class_register(struct class *cls);
void class_unregister(struct class *cls);
```


<div id="device" />

## Linux 设备对象

设备对象全部收集在 devices_subsys 子系统中, 该子系统对应的目录为 /sys/devices， 一个设备是某个"孩子"的"父亲", 其条件为子设备离开父设备无法正常工作

### 设备对象

```c
struct device {
    struct kobject kobj;  /* 计数器 */
    struct device *parent; /*  父设备 */

    struct device_private *p;

    const char *init_name;

    struct bus_type *bus; /* 这个设备所连接的总线 */
    struct device_driver *driver; /* 这个设备对应的驱动程序 */

    void *driver_data; /* 设备驱动程序私有数据 */
    void *platform_data; /* 遗留设备驱动程序的私有数据 */

##ifdef CONFIG_PROVE_LOCKING
    struct mutex lockdep_mutext;
##endif
    struct mutex mutext;

    struct dev_links_info links;
    struct dev_pm_info power; /* 电源管理信息 */
    struct dev_pm_domain *pm_domain;

##ifdef CONFIG_ENERGY_MODEL
    struct em_perf_domain *em_pd;
##endif

##ifdef CONFIG_GENERIC_MSI_IRQ_DOMAIN
    struct irq_domain *msi_domain;
##endif
##ifdef CONFIG_PRINCTRL
    struct dev_pin_info *pins;
##endif
##ifdef CONFIG_GENERIC_MSI_IRQ
    struct list_head msi_list;
##endif
##ifdef CONFIG_DMA_OPS
    const struct dma_map_ops *dma_ops;
##endif
    u64 *dma_mask;  /* 设备的DMA屏蔽字 */
    u64 coherent_dma_msk; /* 设备的一致性DMA的屏蔽字 */
    u64 bus_dma_list;

    const struct bus_dma_region *dma_range_map;

    struct device_dma_parameters *dma_parms;

    struct list_head dma_pools; /* 聚集的DMA缓冲池链表的首部 */

##ifdef CONFIG_DMA_DECLARE_COHERENT
    struct dma_coherent_mem *dma_mem; /* 设备所使用的一致性DMA存储器描述符 */
##endif

##ifdef CONFIG_DMA_CMA
    struct cma *cma_area;
##endif
    struct dev_archdata archdata;

    struct device_node *of_node;
    struct fwnode_handle *fwnode;

##ifdef CONFIG_NUMA
    int numa_node;
##endif
    dev_t devt;
    u32 id;
    spinlock_t devres_lock;
    struct list_head devres_head;

    struct class *class;
    const struct attribute_group **groups;

    void (*release)(struct  devie *dev); /* 释放设备描述符的回调函数 */

    struct iommu_group *iommu_group;
    struct dev_iommu *iommu;

    bool offline_disabled:1;
    bool offline:1;
    bool of_node_reused:1;
    bool state_synced:1;
##if defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_DEICE) || \
    defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_CPU) || \
    defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_CPU_ALL) ||
    bool dma_coherent:1;
##endif
ifdef CONFIG_DMA_OPS_BYPASS
    bool dma_ops_bypass:1;
##endif
};

```

| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| parent     | 设备的"父"设备 ---- 指的是该设备所属的设备, 通常是某种总线或宿主控制器, 为NULL, 表示该设备是顶层设备 |
| kobj       | 表示该设备并把它连接到结构体系中的 kobject |
| bus        | 标识了该设备连接在何种类型的总线上 |
| driver     | 管理该设备的驱动程序 |
| driver_data | 有设备驱动程序使用的私有数据成员 |
| release    | 当指向设备的最有一个引用被删除时，内核调用该方法, 又内嵌的 kobject 的 release 方法调用 |


### 设备注册和销毁

```c
int device_register(struct device *dev);
int device_unregister(struct device *dev);
```

如上, 一般通过 device_register 和 device_unregister 函数对设备分别进行注册和销毁, 即**往设备驱动模型中插入一个新的 device 对象, 并自动地在 /sys/devices 目录下为其创建一个新的目录, 或者将设备从设备驱动模型中移除**


示例:
```c
static void ldd_bus_release(struct device *dev)
{
    printk(KERN_DEBUG "lddbus release\n");
}

struct device ldd_Bus = {
    .bus_id = "ldd0",  /* 这里的代码是基于 Linux 2.6 版本, 所以 device 结构体中有 bus_id 成员 */
    .release = ldd_bus_release
};

ret = device_register(&ldd_bus);
if (ret)
{
    printk(KERN_NOTICE " Unable to register ldd0\n");
}
```

一般来说，大多数子系统记录了它们所拥有设备的其他信息, 设备结构并不单独使用, 而是嵌入到高层的设备结构体中, 即将 struct device 设备对象结构体内嵌到具体的设备中, 如I2C, PCI, USB等设备, struct device 作为这些具体设备的一个成员变量, 有点类似于基类

示例:

```c
struct ldd_device {
    char *name;
    struct ldd_driver *driver;
    struct device dev;
};

##define to_ldd_device(dev) container_of(dev, struct ldd_device, dev);
```

所以在这种情况下, 设备的注册会将会如下:

```c
ret = device_register(&ldd_device->dev);
```

当需要的时候, 可以调用 container_of 获取包含 struct device 设备对象的具体设备的结构体, 从而获取到具体设备的其他信息, 如上`to_ldd_device`宏, 就可以根据 struct device 设备对象获取到 ldd_device 对象的 name 字段的值


### 设备属性

```c
/* interface for exporting device attributes */
struct device_attribute {
    struct attribute    attr;
    ssize_t (*show)(struct device *dev, struct device_attribute *attr,
            char *buf);
    ssize_t (*store)(struct device *dev, struct device_attribute *attr,
             const char *buf, size_t count);
};
```

### 对设备的迭代

为了操作注册到某个总线上的每个设备，可以通过 `bus_for_each_dev` 函数进行迭代

```c
int bus_for_each_dev(struct bus_type *bus, struct device *start, void *data, int (*fn)(struct device *, void *));
```

该函数将迭代总线 bus 上的每个设备, start 不为 NULL 的情况下, 从 bus 上 start 位置开始的设备开始迭代, 否则从 bus 上的第一个设备开始迭代, 迭代的每个设备以及 data 将作为 fn 的参数，fn 返回非 0 时, 迭代结束， bus_for_each_dev 返回该值


<div id="device_driver"/>

## Linux 驱动程序对象

设备驱动模型跟踪所有系统所知道的设备, 进行跟踪的主要原因是让驱动程序核心协调驱动程序于新设备之间的关系

### 驱动程序对象

```c
struct device_driver {
    const char *name; /* 设备驱动程序的名称 */
    struct bus_type *bus; /* 总线描述符, 总线连接所支持的设备 */

    struct module *owner;   /* 标识实现驱动程序的模块 */
    const char *mode_name;

    bool suppress_bind_attrs;
    enum probe_type probe_type;

    const struct of_device_id *of_match_table;  /* 设备树节点兼容性匹配表 */
    const struct acpi_device_id *acpi_match_table;

    int (*probe)(struct device *dev); /* 探测设备的方法 */
    void (*sync_state)(struct device *dev);
    int (*remove)(struct deivce *dev); /* 移除设备时所调用的方法 */
    int (*shutdown)(struct devie *dev); /* 设备断电时所调用的方法 */
    int (*suspend)(struct device *dev, pm_message_t state); /* 设备置于低功耗状态时调用的方法 */
    int (*resume)(struct device *dev); /* 设备回复正常状态时调用的方法 */
    const struct attribute_group **groups;
    const struct attribute_group **dev_groups;

    const struct dev_pm_ops *pm;
    void (*coredump)(struct device *dev);

    struct driver_private *p;
};

```

| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| name       | 驱动程序的名字, 它将在 [sysfs 文件系统](../../fs/specialfs.md#sysfs) 中显示 |
| kobj       | 表示该驱动程序并把它连接到结构体系中的 kobject |
| bus        | 标识了该驱动程序所操作的的总线类型 |
| probe      | 用来查询特定设备是否存在以及这个驱动程序是否能够操纵它 |
| remove     | 设备从系统中删除的时候调用 |
| shutdown   | 关机的时候用于关闭设备 |


### 驱动程序的注销和销毁

```c
int driver_register(struct device_driver *drv);
void driver_unregister(struct device_driver *drv);
```

如上, 一般通过 driver_register 和 driver_unregister 函数对驱动程序对象分别进行注册和销毁, 即**往设备驱动模型中插入一个新的 driver 对象, 并自动地在 /sys/drivers 目录下为其创建一个新的目录, 或者将驱动程序对象从设备驱动模型中移除**

和[设备对象](#device)类似, 驱动程序对象往往也会嵌入到更大的具体的驱动程序描述符中

示例:

```c
struct ldd_driver {
    char *version;
    struct module *module;
    struct device_driver driver;
    struct driver_attribute version_attr;
};
```

### 驱动程序的属性


```c
/* sysfs interface for exporting driver attributes */

struct driver_attribute {
    struct attribute attr;
    ssize_t (*show)(struct device_driver *driver, char *buf);
    ssize_t (*store)(struct device_driver *driver, const char *buf,
             size_t count);
};
```

### 对驱动程序对象的迭代

为了操作注册到某个总线上的每个驱动程序对象，可以通过 `bus_for_each_drv` 函数进行迭代

```c
int bus_for_each_dev(struct bus_type *bus, struct device_driver *start, void *data, int (*fn)(struct device_driver *, void *));
```

该函数将迭代总线 bus 上的每个驱动程序对象, start 不为 NULL 的情况下, 从 bus 上 start 位置开始的驱动程序对象开始迭代, 否则从 bus 上的第一个驱动程序对象开始迭代, 迭代的每个驱动程序对象以及 data 将作为 fn 的参数，fn 返回非 0 时, 迭代结束， bus_for_each_drv 返回该值


