# platform 设备

## platform 总线

<div id="platform_bus"/>
一个现实中的设备和驱动通常都需要挂载在一种总线上, 但在 SoC 系统中集成的独立外设控制器、挂载在 SoC 内存空间的外设等不依附于此类总线, 所以, Linux 发明了一种虚拟的总线, 称为 platform 总线, 相应的设备称之为 platform_device, 而驱动称为 platform_driver


匹配 platform_device 和 platform_driver 有 4 种可能性:

1. 基于设备树风格的匹配

2. 基于 ACPI 风格的匹配

3. 匹配 ID 表, 即 platform_device 设备名是否出现在 platform_driver 的 ID 表内

4. 匹配 platform_device 设备名和驱动的名字


## platform 设备

platform 总线上挂载的设备称为 platform 设备

```c
struct platform_device {
    const char  *name;
    int     id;
    bool        id_auto;
    struct device   dev;
    u64     platform_dma_mask;
    struct device_dma_parameters dma_parms;
    u32     num_resources;
    struct resource *resource;

    const struct platform_device_id *id_entry;
    char *driver_override; /* Driver name to force a match */

    /* MFD cell pointer */
    struct mfd_cell *mfd_cell;

    /* arch specific additions */
    struct pdev_archdata    archdata;
};
```

## platform_driver 驱动

platform 总线上挂载的设备对应的驱动程序称为 platform_driver

```c
struct platform_driver {
    int (*probe)(struct platform_device *);
    int (*remove)(struct platform_device *);
    void (*shutdown)(struct platform_device *);
    int (*suspend)(struct platform_device *, pm_message_t state);
    int (*resume)(struct platform_device *);
    struct device_driver driver;
    const struct platform_device_id *id_table;
    bool prevent_deferred_probe;
};
```
