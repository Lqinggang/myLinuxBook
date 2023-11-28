# platform 设备和驱动的匹配

如前面[platform 设备](./platform.md)一节所说, 在调用 platform_device_add 注册 platform 设备的时候, 最终会和普通设备通过 device_register 注册设备一样, 都是调用 device_add 函数将设备添加到 [Linux 设备驱动模型](./model.md)中


## platform 总线注册

### start_kernel

```c
void start_kernel(void)
{
    ...

    /* Do the rest non-__init'ed, we're now alive */
    arch_call_rest_init();

    ...
}

```

如上，在 Linux 系统启动的时候, 会调用执行 start_kernel 函数(执行 start_kernel 函数前, 还有其他操作, 这里不介绍), 开始运行 Linux 系统，在该函数中, 将大部分基础功能初始化完成(如 VFS 系统的初始化等)之后, 会调用 arch_call_rest_init 函数

### reset_init

```c
void __init __weak __noreturn arch_call_rest_init(void)
{
    rest_init();
}

noinline void __ref __noreturn rest_init(void)
{
    /*
     * We need to spawn init first so that it obtains pid 1, however
     * the init task will end up wanting to create kthreads, which, if
     * we schedule it before we create kthreadd, will OOPS.
     */
    pid = user_mode_thread(kernel_init, NULL, CLONE_FS);

    ...
}
```

### kernel_init
```c
static int __ref kernel_init(void *unused)
{
    ...

    kernel_init_freeable();

    ...
}
```


### kernel_init_freeable
```c
static noinline void __init kernel_init_freeable(void)
{
    ...

    do_basic_setup();

    ...
}
```


### do_basic_setup

```c
/*
 * Ok, the machine is now initialized. None of the devices
 * have been touched yet, but the CPU subsystem is up and
 * running, and memory and process management works.
 *
 * Now we can finally start doing some real work..
 */
static void __init do_basic_setup(void)
{
    cpuset_init_smp();
    driver_init();
    init_irq_proc();
    do_ctors();
    do_initcalls();
}
```


### driver_init

```c
/**
 * driver_init - initialize driver model.
 *
 * Call the driver model init functions to initialize their
 * subsystems. Called early from init/main.c.
 */
void __init driver_init(void)
{
    /* These are the core pieces */
    bdi_init(&noop_backing_dev_info);
    devtmpfs_init();
    devices_init();
    buses_init();
    classes_init();
    firmware_init();
    hypervisor_init();

    /* These are also core pieces, but must come after the
     * core core pieces.
     */
    of_core_init();
    platform_bus_init();
    auxiliary_bus_init();
    cpu_dev_init();
    memory_dev_init();
    node_dev_init();
    container_dev_init();
}

```

### platform_bus_init

```c
struct device platform_bus = {
    .init_name  = "platform",
};
EXPORT_SYMBOL_GPL(platform_bus);

struct bus_type platform_bus_type = {
    .name       = "platform",
    .dev_groups = platform_dev_groups,
    .match      = platform_match,
    .uevent     = platform_uevent,
    .probe      = platform_probe,
    .remove     = platform_remove,
    .shutdown   = platform_shutdown,
    .dma_configure  = platform_dma_configure,
    .dma_cleanup    = platform_dma_cleanup,
    .pm     = &platform_dev_pm_ops,
};

int __init platform_bus_init(void)
{
    int error;

    early_platform_cleanup();

    error = device_register(&platform_bus);
    if (error) {
        put_device(&platform_bus);
        return error;
    }
    error =  bus_register(&platform_bus_type);
    if (error)
        device_unregister(&platform_bus);

    return error;
}
```
如上, 通过调用 platform_bus_init 函数注册和初始化 platform 总线

## platform 驱动注册

## platform 设备注册

以下将从 platform 设备注册开始说明, platform 设备和驱动是如何匹配的

### platform_device_register

```c
/**
 * platform_device_register - add a platform-level device
 * @pdev: platform device we're adding
 *
 * NOTE: _Never_ directly free @pdev after calling this function, even if it
 * returned an error! Always use platform_device_put() to give up the
 * reference initialised in this function instead.
 */
int platform_device_register(struct platform_device *pdev)
{
    device_initialize(&pdev->dev);
    setup_pdev_dma_masks(pdev);
    return platform_device_add(pdev);
}
EXPORT_SYMBOL_GPL(platform_device_register);
```

如上, 是 platform_device_register 函数的实现, 其用于注册 platform_device, 其中会调用到 platform_device_add 函数，这个函数会将 platform_device 添加到 Linux 设备驱动模型中

### platform_device_add

```c
/**
 * platform_device_add - add a platform device to device hierarchy
 * @pdev: platform device we're adding
 *
 * This is part 2 of platform_device_register(), though may be called
 * separately _iff_ pdev was allocated by platform_device_alloc().
 */
int platform_device_add(struct platform_device *pdev)
{
    ...

    if (!pdev->dev.parent)
        pdev->dev.parent = &platform_bus;

    pdev->dev.bus = &platform_bus_type;

    ...

    ret = device_add(&pdev->dev);

    ...
}
EXPORT_SYMBOL_GPL(platform_device_add);
```

如上是 platform_device_add 的具体实现, 其中有一行关键代码注意

```c
    pdev->dev.bus = &platform_bus_type;
```

这行代码是将 platform_device 和 platform_bus 进行绑定(platform_bus_type 的定义在[platform 设备](./platform.md#platform_bus)一节, 其是一个全局变量), 在 platform_bus 中，有一个 .match 对应的回调函数, 将用于 platform_device 和 platform_driver 之间进行匹配


### device_add

```c
/**
 * device_add - add device to device hierarchy.
 * @dev: device.
 *
 * This is part 2 of device_register(), though may be called
 * separately _iff_ device_initialize() has been called separately.
 *
 * This adds @dev to the kobject hierarchy via kobject_add(), adds it
 * to the global and sibling lists for the device, then
 * adds it to the other relevant subsystems of the driver model.
 *
 * Do not call this routine or device_register() more than once for
 * any device structure.  The driver model core is not designed to work
 * with devices that get unregistered and then spring back to life.
 * (Among other things, it's very hard to guarantee that all references
 * to the previous incarnation of @dev have been dropped.)  Allocate
 * and register a fresh new struct device instead.
 *
 * NOTE: _Never_ directly free @dev after calling this function, even
 * if it returned an error! Always use put_device() to give up your
 * reference instead.
 *
 * Rule of thumb is: if device_add() succeeds, you should call
 * device_del() when you want to get rid of it. If device_add() has
 * *not* succeeded, use *only* put_device() to drop the reference
 * count.
 */
int device_add(struct device *dev)
{
    ...

	bus_probe_device(dev);

    ...
}
EXPORT_SYMBOL_GPL(device_add);
```

如上, 是将设备添加到总线上


### platform_match

```c
/**
 * platform_match - bind platform device to platform driver.
 * @dev: device.
 * @drv: driver.
 *
 * Platform device IDs are assumed to be encoded like this:
 * "<name><instance>", where <name> is a short description of the type of
 * device, like "pci" or "floppy", and <instance> is the enumerated
 * instance of the device, like '0' or '42'.  Driver IDs are simply
 * "<name>".  So, extract the <name> from the platform_device structure,
 * and compare it against the name of the driver. Return whether they match
 * or not.
 */
static int platform_match(struct device *dev, struct device_driver *drv)
{
    struct platform_device *pdev = to_platform_device(dev);
    struct platform_driver *pdrv = to_platform_driver(drv);

    /* When driver_override is set, only bind to the matching driver */
    if (pdev->driver_override)
        return !strcmp(pdev->driver_override, drv->name);

    /* Attempt an OF style match first */
    if (of_driver_match_device(dev, drv))
        return 1;

    /* Then try ACPI style match */
    if (acpi_driver_match_device(dev, drv))
        return 1;

    /* Then try to match against the id table */
    if (pdrv->id_table)
        return platform_match_id(pdrv->id_table, pdev) != NULL;

    /* fall-back to driver name match */
    return (strcmp(pdev->name, drv->name) == 0);
}
```


## platform 设备和驱动匹配
