# Linux 总线对象

为了确保计算机能够正常工作, 必须提供数据通路, 让信息在连接到个人计算机的CPU、RAM和I/O设备之间流动，这些数据通路总称为总线

所有计算机都拥有一条系统总线，它连接大部分内部硬件设备, 在[Linux 设备模型](./model.md)中所有的设备都通过总线相连


## 总线对象

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
| match      | 检验给定的设备驱动程序是否支持特有设备的方法, 当一总线上的新设备或者新驱动被添加时, 会一次或多次调用这个函数, 当指定的驱动程序能够处理制定设备时, 返回非零值 |
| hotplug    | 在用户空间产生热插拔事件前, 这个方法运行总线添加环境变量, 其参数与 kset 的 kotplug 方法相同 |


## 总线注册与删除

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

## 总线属性


```c
struct bus_attribute {
    struct attribute    attr;
    ssize_t (*show)(struct bus_type *bus, char *buf);
    ssize_t (*store)(struct bus_type *bus, const char *buf, size_t count);
};
```
