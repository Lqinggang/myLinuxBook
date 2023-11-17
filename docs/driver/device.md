# Linux 设备对象

设备对象全部收集在 devices_subsys 子系统中, 该子系统对应的目录为 /sys/devices， 一个设备是某个"孩子"的"父亲", 其条件为子设备离开父设备无法正常工作

## 设备对象

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

| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| parent     | 设备的"父"设备 ---- 指的是该设备所属的设备, 通常是某种总线或宿主控制器, 为NULL, 表示该设备是顶层设备 |
| kobj       | 表示该设备并把它连接到结构体系中的 kobject |
| bus        | 标识了该设备连接在何种类型的总线上 |
| driver     | 管理该设备的驱动程序 |
| driver_data | 有设备驱动程序使用的私有数据成员 |
| release    | 当指向设备的最有一个引用被删除时，内核调用该方法, 又内嵌的 kobject 的 release 方法调用 |


## 设备注册和销毁

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


## 设备属性

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

## 设备结构的嵌入

大多数子系统记录了它们所拥有设备的其他信息, 因此通常把类似于 kobject 这样的结构内嵌的设备的高层表示之中, 即将 struct device 设备对象结构体内嵌到具体的设备中, 如I2C, PCI, USB等设备, struct device 作为这些具体设备的一个成员变量, 有点类似于基类

示例:

```c
struct ldd_device {
    char *name;
    struct ldd_driver *driver;
    struct device dev;
};

#define to_ldd_device(dev) container_of(dev, struct ldd_device, dev);
```

## 对设备的迭代

为了操作注册到某个总线上的每个设备，可以通过 `bus_for_each_dev` 函数进行迭代

```c
int bus_for_each_dev(struct bus_type *bus, struct device *start, void *data, int (*fn)(struct device *, void *));
```

该函数将迭代总线 bus 上的每个设备, start 不为 NULL 的情况下, 从 bus 上 start 位置开始的设备开始迭代, 否则从 bus 上的第一个设备开始迭代, 迭代的每个设备以及 data 将作为 fn 的参数，fn 返回非 0 时, 迭代结束， bus_for_each_dev 返回该值
