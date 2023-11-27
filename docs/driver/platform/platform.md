# platform 设备

## platform 总线

<div id="platform_bus"/>
一个现实中的设备和驱动通常都需要挂载在一种总线上, 但在 SoC 系统中集成的独立外设控制器、挂载在 SoC 内存空间的外设等不依附于此类总线, 所以, Linux 发明了一种虚拟的总线, 称为 platform 总线, 相应的设备称之为 platform_device, 而驱动称为 platform_driver

platform 总线存在的意义是为了保持 Linux 驱动模型的统一性(设备挂载在总线上, 由设备驱动程序驱动)

匹配 platform_device 和 platform_driver 有 4 种可能性:

1. 基于设备树风格的匹配

2. 基于 ACPI 风格的匹配

3. 匹配 ID 表, 即 platform_device 设备名是否出现在 platform_driver 的 ID 表内

4. 匹配 platform_device 设备名和驱动的名字


## platform 设备

platform 总线上挂载的设备称为 platform 设备

```c
struct platform_device {
    const char  *name;  /* 设备名 */
    int     id;         /* 设备ID */
    bool        id_auto;
    struct device   dev;
    u64     platform_dma_mask;
    struct device_dma_parameters dma_parms;
    u32     num_resources;     /* 设备资源数 */
    struct resource *resource; /* 设备资源 */

    const struct platform_device_id *id_entry;
    char *driver_override; /* Driver name to force a match */

    /* MFD cell pointer */
    struct mfd_cell *mfd_cell;

    /* arch specific additions */
    struct pdev_archdata    archdata;
};
```

如上，是 platform 设备结构体, 它更像是对 `struct device`的一种封装, 可以看到它结构有点类似于[Linux 设备驱动组件](../modules/modules.md)中提到的将`struct device`嵌入到高层的设备结构中的一种表现形式(从 platform_device_register 和 device_register 实现来看, 似乎也能证实这一点, platform_device_register 比 device_register 多出来的部分主要就是初始化或设置 platform_device 中的字段, 其他部分也和 device_register 是一样的, 即都是先执行device_initialize，然后执行 device_add)

### platform 设备的注册和销毁

```c
extern int platform_device_register(struct platform_device *);
extern void platform_device_unregister(struct platform_device *);
```

## platform 设备资源

```c
/*
 * Resources are tree-like, allowing
 * nesting etc..
 */
struct resource {
    resource_size_t start;
    resource_size_t end;
    const char *name;
    unsigned long flags;
    unsigned long desc;
    struct resource *parent, *sibling, *child;
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
### platform 驱动的注册和销毁

```c
/*
 * use a macro to avoid include chaining to get THIS_MODULE
 */
#define platform_driver_register(drv) \
    __platform_driver_register(drv, THIS_MODULE)
extern int __platform_driver_register(struct platform_driver *,
                    struct module *);
extern void platform_driver_unregister(struct platform_driver *);
```

## platform 设备的匹配

## 示例

```c
static struct platform_device pcmtst_pdev = {
    .name =     "pcmtest",
    .dev.release =  pcmtst_pdev_release,
};

static struct platform_driver pcmtst_pdrv = {
    .probe =    pcmtst_probe,
    .remove_new =   pdev_remove,
    .driver =   {
        .name = "pcmtest",
    },
};

static int __init mod_init(void)
{
    int err = 0;

    buf_allocated = setup_patt_bufs();
    if (!buf_allocated)
        return -ENOMEM;

    snd_pcmtst_hw.channels_max = buf_allocated;

    err = init_debug_files(buf_allocated);
    if (err)
        return err;
    esrr = platform_device_register(&pcmtst_pdev);
    if (err)
        return err;
    err = platform_driver_register(&pcmtst_pdrv);
    if (err)
        platform_device_unregister(&pcmtst_pdev);
    return err;
}

static void __exit mod_exit(void)
{
    clear_debug_files();
    free_pattern_buffers();

    platform_driver_unregister(&pcmtst_pdrv);
    platform_device_unregister(&pcmtst_pdev);
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Ivan Orlov");
module_init(mod_init);
module_exit(mod_exit);
```
