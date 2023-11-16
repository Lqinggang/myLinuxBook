# Linux 设备对象


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


