# Linux 设备驱动

设备驱动程序作用是初始化实际硬件设备, 并将用户的操作映射到实际硬件的设备特有操作上, 驱动提供的是一种机制而不是策略, 即提供可以做什么的功能, 而不是提供应该怎么使用这些功能


## Linux 基本设备类型
Linux 系统将设备分成如下三种基本类型, 后续介绍的特定的设备基本都是基于这几个基本类型

1. 字符设备

字符设备即是个能够像字节流一样被访问的设备，通常需要实现open, close, read, write系统调用


2. 块设备

块设备即进行I/O操作时, 每次只能传输一个或多个完整的块, 每块包含512字节(或2的更高次幂的数据)

3. 网络接口

任何网络事务都经过一个网络接口形成, 即一个能够和其他主机交换数据的设备, 接口通常是一个硬件设备, 或者纯软件设备(如loopback设备)


## Linux 设备驱动模型基本数据结构

设备驱动模型都是建立在如下几个基本数据结构中, 其中总线是设备间进行数据流通的通路, 设备挂载在总线上, 每个总线上可以由多个设备, 每个设备对应一个驱动程序, 通过驱动程序完成设备的初始化, 并使设备功能正常工作


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

kobject 是组成设备模型的基本结构, 单独的 kobject 对象一般很少使用(甚至不会使用), kobject 对象都是被嵌入到其他数据结构中, 在其他数据结构中担任很重要的作用, 其他说明, 请参考[kobject对象](./kobject.md)一节

### Linux 设备对象


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

#ifdef CONFIG_PROVE_LOCKING
    struct mutex lockdep_mutext;
#endif
    struct mutex mutext;

    struct dev_links_info links;
    struct dev_pm_info power; /* 电源管理信息 */
    struct dev_pm_domain *pm_domain;

#ifdef CONFIG_ENERGY_MODEL
    struct em_perf_domain *em_pd;
#endif

#ifdef CONFIG_GENERIC_MSI_IRQ_DOMAIN
    struct irq_domain *msi_domain;
#endif
#ifdef CONFIG_PRINCTRL
    struct dev_pin_info *pins;
#endif
#ifdef CONFIG_GENERIC_MSI_IRQ
    struct list_head msi_list;
#endif
#ifdef CONFIG_DMA_OPS
    const struct dma_map_ops *dma_ops;
#endif
    u64 *dma_mask;  /* 设备的DMA屏蔽字 */
    u64 coherent_dma_msk; /* 设备的一致性DMA的屏蔽字 */
    u64 bus_dma_list;

    const struct bus_dma_region *dma_range_map;

    struct device_dma_parameters *dma_parms;

    struct list_head dma_pools; /* 聚集的DMA缓冲池链表的首部 */

#ifdef CONFIG_DMA_DECLARE_COHERENT
    struct dma_coherent_mem *dma_mem; /* 设备所使用的一致性DMA存储器描述符 */
#endif

#ifdef CONFIG_DMA_CMA
    struct cma *cma_area;
#endif
    struct dev_archdata archdata;

    struct device_node *of_node;
    struct fwnode_handle *fwnode;

#ifdef CONFIG_NUMA
    int numa_node;
#endif
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
#if defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_DEICE) || \
    defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_CPU) || \
    defined(CONFIG_ARCH_HAS_SYNC_DMA_FOR_CPU_ALL) ||
    bool dma_coherent:1;
#endif
ifdef CONFIG_DMA_OPS_BYPASS
    bool dma_ops_bypass:1;
#endif
};

```

设备驱动程序中, 每个设备是由一个`device`对象来描述

### Linux 驱动程序对象

```c
struct device_driver {
    const char *name; /* 设备驱动程序的名称 */
    struct bus_type *bus; /* 总线描述符, 总线连接所支持的设备 */

    struct module *owner;   /* 标识实现驱动程序的模块 */
    const char *mode_name;

    bool suppress_bind_attrs;
    enum probe_type probe_type;

    const struct of_device_id *of_match_table;
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

每个设备驱动都由`device_drive`对象描述, 在Linux 设备对象(struct device结构体)中, 有一个`driver`字段, 即表示设备对应的驱动程序

### Linux 总线对象



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

内核支持的每一种总线类型都由一个`bus_type`对象描述


### Linux 类对象

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

## Linux 设备文件


设备标识符由设备文件的类型(字符或块)和一对参数组成，第一个参数称为主设备号, 长度为12位, 第二个参数为次设备号, 长度为20位, 通常这两个参数合并为一个32位的 dev_t 类型变量, 通过 MAJOR() 和 MINOR() 宏从 dev_t 类型变量中提取主设备号和次设备号, 通过 MKDEV() 宏将主设备号和次设备号合并成一个 dev_t 值
