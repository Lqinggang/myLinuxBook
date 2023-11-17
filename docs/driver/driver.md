# Linux 驱动程序对象


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

## 对驱动程序对象的迭代

为了操作注册到某个总线上的每个驱动程序对象，可以通过 `bus_for_each_drv` 函数进行迭代

```c
int bus_for_each_dev(struct bus_type *bus, struct device_driver *start, void *data, int (*fn)(struct device_driver *, void *));
```

该函数将迭代总线 bus 上的每个驱动程序对象, start 不为 NULL 的情况下, 从 bus 上 start 位置开始的驱动程序对象开始迭代, 否则从 bus 上的第一个驱动程序对象开始迭代, 迭代的每个驱动程序对象以及 data 将作为 fn 的参数，fn 返回非 0 时, 迭代结束， bus_for_each_drv 返回该值
