# Linux 驱动程序对象

设备驱动模型跟踪所有系统所知道的设备, 进行跟踪的主要原因是让驱动程序核心协调驱动程序于新设备之间的关系

## 驱动程序对象

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

| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| name       | 驱动程序的名字, 它将在 [sysfs 文件系统](../fs/specialfs.md#sysfs) 中显示 |
| kobj       | 表示该驱动程序并把它连接到结构体系中的 kobject |
| bus        | 标识了该驱动程序所操作的的总线类型 |
| probe      | 用来查询特定设备是否存在以及这个驱动程序是否能够操纵它 |
| remove     | 设备从系统中删除的时候调用 |
| shutdown   | 关机的时候用于关闭设备 |


## 驱动程序的注销和销毁

```c
int driver_register(struct device_driver *drv);
void driver_unregister(struct device_driver *drv);
```

如上, 一般通过 driver_register 和 driver_unregister 函数对驱动程序对象分别进行注册和销毁, 即**往设备驱动模型中插入一个新的 driver 对象, 并自动地在 /sys/drivers 目录下为其创建一个新的目录, 或者将驱动程序对象从设备驱动模型中移除**

和[设备对象](./device.md)类似, 驱动程序对象往往也会嵌入到更大的具体的驱动程序描述符中

示例:

```c
struct ldd_driver {
    char *version;
    struct module *module;
    struct device_driver driver;
    struct driver_attribute version_attr;
};
```

## 驱动程序的属性


```c
/* sysfs interface for exporting driver attributes */

struct driver_attribute {
    struct attribute attr;
    ssize_t (*show)(struct device_driver *driver, char *buf);
    ssize_t (*store)(struct device_driver *driver, const char *buf,
             size_t count);
};
```

## 对驱动程序对象的迭代

为了操作注册到某个总线上的每个驱动程序对象，可以通过 `bus_for_each_drv` 函数进行迭代

```c
int bus_for_each_dev(struct bus_type *bus, struct device_driver *start, void *data, int (*fn)(struct device_driver *, void *));
```

该函数将迭代总线 bus 上的每个驱动程序对象, start 不为 NULL 的情况下, 从 bus 上 start 位置开始的驱动程序对象开始迭代, 否则从 bus 上的第一个驱动程序对象开始迭代, 迭代的每个驱动程序对象以及 data 将作为 fn 的参数，fn 返回非 0 时, 迭代结束， bus_for_each_drv 返回该值


## platform_driver 驱动

platform 总线上挂载的设备对应的驱动程序称为 platform_driver, 参考[platform 总线](./bus_type.md#platform_bus)

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
