# platform 设备和驱动的匹配

如前面[platform 设备](./platform.md)一节所说, 在调用 platform_device_add 注册 platform 设备的时候, 最终会和普通设备通过 device_register 注册设备一样, 都是调用 device_add 函数将设备添加到 [Linux 设备驱动模型](./model.md)中


## platform 总线注册

以下是 platform 总线注册时依次调用到的函数

```text
start_kernel
    ----> reset_init
        ----> kernel_init
            ----> kernel_init_freeable
                ----> do_basic_setup
                    ----> driver_init
                        ----> platform_bus_init
```

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

### reset\_init

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

### kernel\_init
```c
static int __ref kernel_init(void *unused)
{
    ...

    kernel_init_freeable();

    ...
}
```


### kernel\_init\_freeable
```c
static noinline void __init kernel_init_freeable(void)
{
    ...

    do_basic_setup();

    ...
}
```


### do\_basic\_setup

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


### driver\_init

<div id="driver_init" />

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
如上, 是初始化 Linux 设备驱动模型, 其中包含了 VFS 相关的注册等, 其中 buses_init 这个会注册 /sys/bus, 可以理解为 Linux 系统所有已注册的总线集合, 这个总线集合使用 bus_kset 全局变量进行保存, 后续注册的全部总线都是追加到该 bus_kset 对应的链表中(bus_kset 是一个 [struct kset 数据结构](../modules/modules.md)的变量, 其中的 list 成员变量就是保存所有已注册总线的循环链表), 在 platform_bus_init 函数中, 将要注册的 platform 总线也将被追加到 bus_kset 对应链表中


### platform\_bus\_init

<div id="platform_bus_init"/>

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
如上, 通过调用 platform_bus_init 函数注册和初始化 platform 总线, 同时也会注册一个总线设备

### device_register


<div id="device_register" />

```c
struct device platform_bus = {
    .init_name  = "platform",
};
EXPORT_SYMBOL_GPL(platform_bus);

/**
 * device_register - register a device with the system.
 * @dev: pointer to the device structure
 *
 * This happens in two clean steps - initialize the device
 * and add it to the system. The two steps can be called
 * separately, but this is the easiest and most common.
 * I.e. you should only call the two helpers separately if
 * have a clearly defined need to use and refcount the device
 * before it is added to the hierarchy.
 *
 * For more information, see the kerneldoc for device_initialize()
 * and device_add().
 *
 * NOTE: _Never_ directly free @dev after calling this function, even
 * if it returned an error! Always use put_device() to give up the
 * reference initialized in this function instead.
 */
int device_register(struct device *dev)
{
    device_initialize(dev);
    return device_add(dev);
}
EXPORT_SYMBOL_GPL(device_register);
```

如上是, 通过 device_register 函数注册一个 platform_bus, device_register 调用的 device_add 函数将在后续章节中介绍

### bus\_register

<div id="bus_register" />

```c
/**
 * bus_register - register a driver-core subsystem
 * @bus: bus to register
 *
 * Once we have that, we register the bus with the kobject
 * infrastructure, then register the children subsystems it has:
 * the devices and drivers that belong to the subsystem.
 */
int bus_register(const struct bus_type *bus)
{
    int retval;
    struct subsys_private *priv;
    struct kobject *bus_kobj;
    struct lock_class_key *key;

    /* 以下会给总线申请 struct subsys_private 数据结构*/
    priv = kzalloc(sizeof(struct subsys_private), GFP_KERNEL);
    if (!priv)
        return -ENOMEM;

    priv->bus = bus;

    BLOCKING_INIT_NOTIFIER_HEAD(&priv->bus_notifier);

    bus_kobj = &priv->subsys.kobj;
    retval = kobject_set_name(bus_kobj, "%s", bus->name);
    if (retval)
        goto out;

    bus_kobj->kset = bus_kset;
    bus_kobj->ktype = &bus_ktype;
    priv->drivers_autoprobe = 1; /* 是否自动探测设备, 在 bus_probe_device 函数中会用到 */

    retval = kset_register(&priv->subsys);
    if (retval)
        goto out;

    retval = bus_create_file(bus, &bus_attr_uevent);
    if (retval)
        goto bus_uevent_fail;

    priv->devices_kset = kset_create_and_add("devices", NULL, bus_kobj);
    if (!priv->devices_kset) {
        retval = -ENOMEM;
        goto bus_devices_fail;
    }
    priv->drivers_kset = kset_create_and_add("drivers", NULL, bus_kobj);
    if (!priv->drivers_kset) {
        retval = -ENOMEM;
        goto bus_drivers_fail;
    }

    INIT_LIST_HEAD(&priv->interfaces);  /* 初始化接口链表? */
    key = &priv->lock_key;
    lockdep_register_key(key);
    __mutex_init(&priv->mutex, "subsys mutex", key);
    klist_init(&priv->klist_devices, klist_devices_get, klist_devices_put); /* 注意这里, 这里会初始化priv->klist_devices, 并设置其 get 和 put 回调函数, 该链表应该是挂载在总线上的设备链表 */
    klist_init(&priv->klist_drivers, NULL, NULL);   /* priv->klist_drivers 应该是挂载在总线上的驱动链表 */

    retval = add_probe_files(bus);
    if (retval)
        goto bus_probe_files_fail;

    retval = sysfs_create_groups(bus_kobj, bus->bus_groups);
    if (retval)
        goto bus_groups_fail;

    pr_debug("bus: '%s': registered\n", bus->name);
    return 0;

bus_groups_fail:
    remove_probe_files(bus);
bus_probe_files_fail:
    kset_unregister(priv->drivers_kset);
bus_drivers_fail:
    kset_unregister(priv->devices_kset);
bus_devices_fail:
    bus_remove_file(bus, &bus_attr_uevent);
bus_uevent_fail:
    kset_unregister(&priv->subsys);
out:
    kfree(priv);
    return retval;
}
EXPORT_SYMBOL_GPL(bus_register);
```

这里总线注册的具体实现, 可以看到这里为总线申请了私有数据结构 struct subsys_private, 并且把总线加入到了 bus_kset 中, 注意这里还初始化了 &priv->interfaces 链表，在后面提到的 bus_probe_device 函数中将会遍历该链表

## platform 驱动注册

platform 驱动通过 platform_driver_register 函数进行注册

其函数调用顺序如下:

```text
platform_driver_register
    ----> __platform_driver_register
        ----> driver_register
            ----> bus_add_driver
```

### platform\_driver\_register


<div id="platform_driver_register" />

```c
/*
 * use a macro to avoid include chaining to get THIS_MODULE
 */
#define platform_driver_register(drv) \
    __platform_driver_register(drv, THIS_MODULE)
extern int __platform_driver_register(struct platform_driver *,
                    struct module *);
```

如上, 是 platform_driver_register 函数的声明, 其是 \__platform_driver_register 函数的封装


### \_\_platform\_driver\_register

<div id="__platform_driver_register" />

```
/**
 * __platform_driver_register - register a driver for platform-level devices
 * @drv: platform driver structure
 * @owner: owning module/driver
 */
int __platform_driver_register(struct platform_driver *drv,
                struct module *owner)
{
    drv->driver.owner = owner;
    drv->driver.bus = &platform_bus_type; /* platform 驱动和设备都是挂载在 platform_bus_type 上 */

    return driver_register(&drv->driver);
}
EXPORT_SYMBOL_GPL(__platform_driver_register);
```

如上, 是 \__platform_driver_register 的具体实现, 在这个函数中可以看到, 其将 platform 驱动对应的总线设置为前一节中注册的 platform_bus_type,  然后通过 driver_register 函数进行驱动的实际注册, 从这里不难看出 platform 驱动实际上就是普通驱动的一种特列


### driver\_register


<div id="driver_register" />

```c
/**
 * driver_register - register driver with bus
 * @drv: driver to register
 *
 * We pass off most of the work to the bus_add_driver() call,
 * since most of the things we have to do deal with the bus
 * structures.
 */
int driver_register(struct device_driver *drv)
{
    int ret;
    struct device_driver *other;

    /* 检测总线是否已注册 */
    if (!bus_is_registered(drv->bus)) {
        pr_err("Driver '%s' was unable to register with bus_type '%s' because the bus was not initialized.\n",
               drv->name, drv->bus->name);
        return -EINVAL;
    }

    if ((drv->bus->probe && drv->probe) ||
        (drv->bus->remove && drv->remove) ||
        (drv->bus->shutdown && drv->shutdown))
        pr_warn("Driver '%s' needs updating - please use "
            "bus_type methods\n", drv->name);

    /* 检测驱动是否已注册 */
    other = driver_find(drv->name, drv->bus);
    if (other) {
        pr_err("Error: Driver '%s' is already registered, "
            "aborting...\n", drv->name);
        return -EBUSY;
    }

    /* 注册驱动到总线上 */
    ret = bus_add_driver(drv);
    if (ret)
        return ret;
    ret = driver_add_groups(drv, drv->groups);
    if (ret) {
        bus_remove_driver(drv);
        return ret;
    }
    kobject_uevent(&drv->p->kobj, KOBJ_ADD);
    deferred_probe_extend_timeout();

    return ret;
}
EXPORT_SYMBOL_GPL(driver_register);
```

如上, 是 driver_register 函数的具体实现，该函数首先通过 bus_is_registered 函数检查总线是否被注册(bus_is_registered 实际上就是通过在 bus_kset 全局变量中查找对应的总线是否存在来判断总线是否注册), 随后通过 driver_find 函数检查总线上是否已经存在相同驱动名, 即总线上是否已经注册过该驱动, 最后通过 bus_add_driver 将驱动注册到总线上

::: tip 说明
所以, 当一个设备插入时, 设备在总线上挂载, 并在该总线上从已注册的驱动中查找符合设备的驱动, 然后运行, Linux 设备驱动模型?
:::

### bus\_add\_driver


<div id="bus_add_driver" />

```c
/**
 * bus_add_driver - Add a driver to the bus.
 * @drv: driver.
 */
int bus_add_driver(struct device_driver *drv)
{
    struct subsys_private *sp = bus_to_subsys(drv->bus);
    struct driver_private *priv;
    int error = 0;

    if (!sp)
        return -EINVAL;

    /*
     * Reference in sp is now incremented and will be dropped when
     * the driver is removed from the bus
     */
    pr_debug("bus: '%s': add driver %s\n", sp->bus->name, drv->name);

    priv = kzalloc(sizeof(*priv), GFP_KERNEL);
    if (!priv) {
        error = -ENOMEM;
        goto out_put_bus;
    }
    klist_init(&priv->klist_devices, NULL, NULL);
    priv->driver = drv;
    drv->p = priv;
    priv->kobj.kset = sp->drivers_kset;
    error = kobject_init_and_add(&priv->kobj, &driver_ktype, NULL,
                     "%s", drv->name);
    if (error)
        goto out_unregister;

    klist_add_tail(&priv->knode_bus, &sp->klist_drivers);
    if (sp->drivers_autoprobe) {
        error = driver_attach(drv);
        if (error)
            goto out_del_list;
    }
    module_add_driver(drv->owner, drv);

    error = driver_create_file(drv, &driver_attr_uevent);
    if (error) {
        printk(KERN_ERR "%s: uevent attr (%s) failed\n",
            __func__, drv->name);
    }
    error = driver_add_groups(drv, sp->bus->drv_groups);
    if (error) {
        /* How the hell do we get out of this pickle? Give up */
        printk(KERN_ERR "%s: driver_add_groups(%s) failed\n",
            __func__, drv->name);
    }

    if (!drv->suppress_bind_attrs) {
        error = add_bind_files(drv);
        if (error) {
            /* Ditto */
            printk(KERN_ERR "%s: add_bind_files(%s) failed\n",
                __func__, drv->name);
        }
    }

    return 0;

out_del_list:
    klist_del(&priv->knode_bus);
out_unregister:
    kobject_put(&priv->kobj);
    /* drv->p is freed in driver_release()  */
    drv->p = NULL;
out_put_bus:
    subsys_put(sp);
    return error;
}
```

如上, 通过 bus_add_driver 函数将驱动注册到总线上, 后续设备挂载到总线上时, 将从该总线上查找对应的驱动程序

其中，
```c
klist_add_tail(&priv->knode_bus, &sp->klist_drivers);
```
是将驱动注册到总线上的关键代码，`&sp->klist_drivers` 中的`sp`即在调用`bus_register`时申请的数据接口，同样在`bus_register`中也会对`klist_drivers`进行初始化, 所以每调用一次`bus_add_driver`函数新增的驱动就被追加到总线的`klist_drivers`链表中


## platform 设备注册

以下 platform 设备注册过程, platform 设备通过 platform_device_register 函数进行注册

### platform\_device\_register

<div id="platform_device_register" />

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

### platform\_device\_add

<div id="platform_device_add" />

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

    /* 父设备 */
    if (!pdev->dev.parent)
        pdev->dev.parent = &platform_bus;

    /* 总线 */
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

这行代码是将 platform_device 和 platform_bus 进行绑定(platform_bus_type 的定义在[platform 设备](./platform.md#platform_bus)一节, 其是一个全局变量), 在 platform_bus_type 中，有一个 .match 对应的回调函数, 将用于 platform_device 和 platform_driver 之间进行匹配

另外, 在没有设置父设备的情况下, 会将新增设备的父设备设置为 platform_bus, 其在前一节中的 platform_bus_init 函数中进行注册

这里，platform 设备最终会通过调用 device_add 函数将添加到设备驱动模型中


### device\_add

<div id="device_add" />

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

    error = device_create_file(dev, &dev_attr_uevent);
    if (error)
        goto attrError;

    error = device_add_class_symlinks(dev);
    if (error)
        goto SymlinkError;
    error = device_add_attrs(dev);
    if (error)
        goto AttrsError;
    error = bus_add_device(dev);
    if (error)
        goto BusError;
    error = dpm_sysfs_add(dev);
    if (error)
        goto DPMError;
    device_pm_add(dev);

    ...

	bus_probe_device(dev);

    ...
}
EXPORT_SYMBOL_GPL(device_add);
```

如上, 是通过 bus_add_device 将设备添加到总线上, 随后通过 bus_probe_device 触发设备插入, 探测并加载驱动


### bus\_add\_device

<div id="bus_add_device" />

```c
/**
 * bus_add_device - add device to bus
 * @dev: device being added
 *
 * - Add device's bus attributes.
 * - Create links to device's bus.
 * - Add the device to its bus's list of devices.
 */
int bus_add_device(struct device *dev)
{
    struct subsys_private *sp = bus_to_subsys(dev->bus);
    int error;

    if (!sp) {
        /*
         * This is a normal operation for many devices that do not
         * have a bus assigned to them, just say that all went
         * well.
         */
        return 0;
    }

    /*
     * Reference in sp is now incremented and will be dropped when
     * the device is removed from the bus
     */

    pr_debug("bus: '%s': add device %s\n", sp->bus->name, dev_name(dev));

    error = device_add_groups(dev, sp->bus->dev_groups);
    if (error)
        goto out_put;

    error = sysfs_create_link(&sp->devices_kset->kobj, &dev->kobj, dev_name(dev));
    if (error)
        goto out_groups;

    error = sysfs_create_link(&dev->kobj, &sp->subsys.kobj, "subsystem");
    if (error)
        goto out_subsys;

    klist_add_tail(&dev->p->knode_bus, &sp->klist_devices);
    return 0;
out_subsys:
    sysfs_remove_link(&sp->devices_kset->kobj, dev_name(dev));
out_groups:
    device_remove_groups(dev, sp->bus->dev_groups);
out_put:
    subsys_put(sp);
    return error;
}
```

如上, 通过 klist_add_tail 函数将设备追加到了总线的 klist_devices 链表中(这里的总线指的是 platform_bus_init 中注册的总线 platform_bus_type, 可以看到在 bus_register 函数中为总线申请了 struct subsys_private 数据结构)

`bus_to_subsys(dev->bus)` 是获取总线的`struct subsys_private`数据(即总线私有数据), 对于 platform 设备这里的 `dev->bus`是 platform_bus_type (可以在__platform_driver_register 函数中看到设置), 而 platform_bus_type  对应的`struct subsys_private`数据结构成员变量则在通过`bus_register(&platform_bus_type)`注册总线的时候进行申请


::: tip 说明
在 bus_add_driver 函数中, 将准备注册的驱动追加到 klist_drivers 链表

在 bus_add_device 函数中, 将准备注册的设备追加到 klist_devices 链表
:::

### bus\_probe\_device

<div id="bus_probe_device" />

```c
/**
 * bus_probe_device - probe drivers for a new device
 * @dev: device to probe
 *
 * - Automatically probe for a driver if the bus allows it.
 */
void bus_probe_device(struct device *dev)
{
    struct subsys_private *sp = bus_to_subsys(dev->bus); /* 遍历 bus_kset, 找到对应的总线 */
    struct subsys_interface *sif;

    if (!sp)
        return;

    /* 驱动的匹配 */
    if (sp->drivers_autoprobe)
        device_initial_probe(dev);

    mutex_lock(&sp->mutex);
    list_for_each_entry(sif, &sp->interfaces, node)
        if (sif->add_dev)
            sif->add_dev(dev, sif);
    mutex_unlock(&sp->mutex);
    subsys_put(sp);
}
```

在执行完 bus_add_device 和 bus_add_driver 之后, 总线上就存在了已注册到设备和驱动, 这个时候就可以通过 bus_probe_device 去触发总线进行设备和驱动之间的匹配工作了

其中, **驱动和设备的匹配是通过 device_initial_probe 完成的**, 其中 sp->drivers_autoprobe 是通过 bus_register 函数注册 platform_bus_type 时进行设置的, 其值等于1

::: tip 说明
如果这里是总线探测设备, 找到对应的驱动的话, 那是不是在驱动注册的时候应该也有一个总线探测设备(针对先插入设备后安装驱动)? 不过似乎在注册驱动的时候, 没有看到有类似的操作, 但是在 `static void deferred_probe_work_func(struct work_struct *work)` 中, 有调用 bus_probe_device 函数, 难道是这里定时去检测?
:::

## platform 设备和驱动匹配

以下是 platform 总线注册时依次调用到的函数

```text
__device_attach
    ----> device_bind_driver
        ----> driver_bound
    ----> bus_for_each_drv
        ----> __device_attach_driver
        ----> platform_match
```

### device\_initial\_probe

<div id="device_initial_probe" />

```c
/**
 * device_attach - try to attach device to a driver.
 * @dev: device.
 *
 * Walk the list of drivers that the bus has and call
 * driver_probe_device() for each pair. If a compatible
 * pair is found, break out and return.
 *
 * Returns 1 if the device was bound to a driver;
 * 0 if no matching driver was found;
 * -ENODEV if the device is not registered.
 *
 * When called for a USB interface, @dev->parent lock must be held.
 */
int device_attach(struct device *dev)
{
    return __device_attach(dev, false);
}
EXPORT_SYMBOL_GPL(device_attach);

void device_initial_probe(struct device *dev)
{
    __device_attach(dev, true);
}
```
如上一章所诉, 在 bus_probe_device 中, 通过 device_initial_probe 函数为设备进行探测驱动


### \__device\_attach

<div id="__device_attach" />

```c
static int __device_attach(struct device *dev, bool allow_async)
{
    int ret = 0;
    bool async = false;

    device_lock(dev);
    if (dev->p->dead) {
        goto out_unlock;
    } else if (dev->driver) {
        if (device_is_bound(dev)) {
            ret = 1;
            goto out_unlock;
        }
        ret = device_bind_driver(dev);
        if (ret == 0)
            ret = 1;
        else {
            dev->driver = NULL;
            ret = 0;
        }
    } else {
        struct device_attach_data data = {
            .dev = dev,
            .check_async = allow_async,
            .want_async = false,
        };

        if (dev->parent)
            pm_runtime_get_sync(dev->parent);

        ret = bus_for_each_drv(dev->bus, NULL, &data,
                    __device_attach_driver);
        if (!ret && allow_async && data.have_async) {
            /*
             * If we could not find appropriate driver
             * synchronously and we are allowed to do
             * async probes and there are drivers that
             * want to probe asynchronously, we'll
             * try them.
             */
            dev_dbg(dev, "scheduling asynchronous probe\n");
            get_device(dev);
            async = true;
        } else {
            pm_request_idle(dev);
        }

        if (dev->parent)
            pm_runtime_put(dev->parent);
    }
out_unlock:
    device_unlock(dev);
    if (async)
        async_schedule_dev(__device_attach_async_helper, dev);
    return ret;
}
```

如上, 是为设备匹配对应的驱动, 这里分成3部分, 第一部分是设备处于`dead`状态(?)时, 不进行处理, 第二部分是设备已经绑定了驱动程序, 此时直接运行其绑定的驱动(这个应该是手动选择驱动程序处理)，第三部分则是遍历总线, 找到运行合适的驱动(这个是自动选择驱动程序的处理)


### 手动选择驱动

#### device_bind_driver

<div id="device_bind_driver" />

```c
/**
 * device_bind_driver - bind a driver to one device.
 * @dev: device.
 *
 * Allow manual attachment of a driver to a device.
 * Caller must have already set @dev->driver.
 *
 * Note that this does not modify the bus reference count.
 * Please verify that is accounted for before calling this.
 * (It is ok to call with no other effort from a driver's probe() method.)
 *
 * This function must be called with the device lock held.
 *
 * Callers should prefer to use device_driver_attach() instead.
 */
int device_bind_driver(struct device *dev)
{
    int ret;

    ret = driver_sysfs_add(dev);
    if (!ret) {
        device_links_force_bind(dev);
        driver_bound(dev);
    }
    else
        bus_notify(dev, BUS_NOTIFY_DRIVER_NOT_BOUND);
    return ret;
}
EXPORT_SYMBOL_GPL(device_bind_driver);
```

如上, 是绑定一个驱动到设备的操作, 其具体实现通过 driver_bound 函数完成


#### driver_bound

<div id="driver_bound" />

```c
/**
 * device_is_bound() - Check if device is bound to a driver
 * @dev: device to check
 *
 * Returns true if passed device has already finished probing successfully
 * against a driver.
 *
 * This function must be called with the device lock held.
 */
bool device_is_bound(struct device *dev)
{
    return dev->p && klist_node_attached(&dev->p->knode_driver);
}

static void driver_bound(struct device *dev)
{
    if (device_is_bound(dev)) {
        pr_warn("%s: device %s already bound\n",
            __func__, kobject_name(&dev->kobj));
        return;
    }

    pr_debug("driver: '%s': %s: bound to device '%s'\n", dev->driver->name,
         __func__, dev_name(dev));

    klist_add_tail(&dev->p->knode_driver, &dev->driver->p->klist_devices);
    device_links_driver_bound(dev);

    device_pm_check_callbacks(dev);

    /*
     * Make sure the device is no longer in one of the deferred lists and
     * kick off retrying all pending devices
     */
    driver_deferred_probe_del(dev);
    driver_deferred_probe_trigger();

    bus_notify(dev, BUS_NOTIFY_BOUND_DRIVER);
    kobject_uevent(&dev->kobj, KOBJ_BIND);
}
```

如上, 是手动为设备绑定一个驱动的实现, 可以看到其通过
```c
klist_add_tail(&dev->p->knode_driver, &dev->driver->p->klist_devices);
```
将设备追加到了驱动的`klist_devices`链表中，之后?

### 自动选择驱动

#### bus\_for\_eac\h_drv

<div id="bus_for_each_drv" />

```c
/**
 * bus_for_each_drv - driver iterator
 * @bus: bus we're dealing with.
 * @start: driver to start iterating on.
 * @data: data to pass to the callback.
 * @fn: function to call for each driver.
 *
 * This is nearly identical to the device iterator above.
 * We iterate over each driver that belongs to @bus, and call
 * @fn for each. If @fn returns anything but 0, we break out
 * and return it. If @start is not NULL, we use it as the head
 * of the list.
 *
 * NOTE: we don't return the driver that returns a non-zero
 * value, nor do we leave the reference count incremented for that
 * driver. If the caller needs to know that info, it must set it
 * in the callback. It must also be sure to increment the refcount
 * so it doesn't disappear before returning to the caller.
 */
int bus_for_each_drv(const struct bus_type *bus, struct device_driver *start,
             void *data, int (*fn)(struct device_driver *, void *))
{
    struct subsys_private *sp = bus_to_subsys(bus);
    struct klist_iter i;
    struct device_driver *drv;
    int error = 0;

    if (!sp)
        return -EINVAL;

    klist_iter_init_node(&sp->klist_drivers, &i,
                 start ? &start->p->knode_bus : NULL);
    while ((drv = next_driver(&i)) && !error)
        error = fn(drv, data);
    klist_iter_exit(&i);
    subsys_put(sp);
    return error;
}
EXPORT_SYMBOL_GPL(bus_for_each_drv);
```

如上, 是迭代总线的 klist_drivers 链表, 依次为设备(data参数是一个结构体, 其dev成员遍历包含待驱动的设备)尝试调用每个驱动程序, 直到某个程序返回 0 为止(??), 表示可以驱动该设备(即这个驱动程序匹配该设备)


#### \__device\_attach\_driver

<div id="__device_attach_driver" />

```c
static int __device_attach_driver(struct device_driver *drv, void *_data)
{
    struct device_attach_data *data = _data;
    struct device *dev = data->dev;
    bool async_allowed;
    int ret;

    ret = driver_match_device(drv, dev);
    if (ret == 0) {
        /* no match */
        return 0;
    } else if (ret == -EPROBE_DEFER) {
        dev_dbg(dev, "Device match requests probe deferral\n");
        dev->can_match = true;
        driver_deferred_probe_add(dev);
        /*
         * Device can't match with a driver right now, so don't attempt
         * to match or bind with other drivers on the bus.
         */
        return ret;
    } else if (ret < 0) {
        dev_dbg(dev, "Bus failed to match device: %d\n", ret);
        return ret;
    } /* ret > 0 means positive match */

    async_allowed = driver_allows_async_probing(drv);

    if (async_allowed)
        data->have_async = true;

    if (data->check_async && async_allowed != data->want_async)
        return 0;

    /*
     * Ignore errors returned by ->probe so that the next driver can try
     * its luck.
     */
    ret = driver_probe_device(drv, dev);
    if (ret < 0)
        return ret;
    return ret == 0;
}
```

\__device_attach_driver 函数用于检测设备是否能够匹配驱动, 其通过 driver_match_device 完成


#### driver_match_device

```c
static inline int driver_match_device(struct device_driver *drv,
                      struct device *dev)
{
    return drv->bus->match ? drv->bus->match(dev, drv) : 1;
}
```
如上, 是在总线的 match 回调函数不为空的情况下, 调用 match 回调函数, 对于 platform 总线来说， match对应的回调函数为 platform_match, 其在注册 platform_bus_type 中定义, 可以查看前面章节中的 [platform_bus_init 部分](#platform_bus_init)

#### platform\_match

<div id="platform_match" />

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

如上, 是在相同总线上进行驱动和设备之间的匹配, 当设备和驱动匹配的情况下, platform_match 返回 1

正如[platform 设备](./platform.md)中提到的一样, platform_match 函数中，platform 设备和 platform 驱动间匹配有 4 种可能性(同时也决定了匹配时的优先级):


##### of_driver_match_device

```c
    /* Attempt an OF style match first */
    if (of_driver_match_device(dev, drv))
        return 1;
```

基于设备树的风格的匹配, 请参考[设备树](../devicetree.md), 基于设备树的匹配是通过驱动的 of_match_table 和设备对应的 of_node 设备树节点进行匹配, 其主要匹配三种类型

(1) 设备树中的 .compatible 兼容属性值和驱动中 of_match_table 匹配表中的 .compatible 匹配

(2) 匹配设备树中的 .device_type

(3) 匹配设备树中的设备节点名


##### acpi_driver_match_device


```c
    /* Then try ACPI style match */
    if (acpi_driver_match_device(dev, drv))
        return 1;
```

基于 ACPI 风格的匹配, 关于 ACPI 表, 请参考[platform设备](./platform.md)

##### platform_match_id


```c
    /* Then try to match against the id table */
    if (pdrv->id_table)
        return platform_match_id(pdrv->id_table, pdev) != NULL;
```

匹配 ID 表, 即 platform_device 设备名是否出现在 platform_driver 的 ID 表内, 关于 ID 表, 请参考[platform设备](./platform.md)

##### dev->name 和 drv->name


```c
    /* fall-back to driver name match */
    return (strcmp(pdev->name, drv->name) == 0);
```

匹配 platform_device 设备名和驱动的名字, 如上, 简单的比较设备和驱动名是否一致, 一致的情况下，表示驱动和设备匹配上了
