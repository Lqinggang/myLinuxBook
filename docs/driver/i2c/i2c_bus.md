# I2C 总线驱动

### i2c\_bus\_type

```c
    .name       = "i2c",
    .match      = i2c_device_match,
    .probe      = i2c_device_probe,
    .remove     = i2c_device_remove,
    .shutdown   = i2c_device_shutdown,
};
EXPORT_SYMBOL_GPL(i2c_bus_type);
```

正如[platform 设备](../platform/platform.md)中介绍的[platform总线](../platform/platform.md#platform_bus)一样, 对于 i2c 设备, 也有一个 i2c 总线, 即如上定义的 i2c_bus_type, 其和 [platform_bus_type](../platform/platform.md#platform_bus)一样, platform_bus_type 是所有 platform 设备和驱动挂载的总线, i2c_bus_type 是所有 i2c 设备和驱动挂载的总线

i2c_bus_type 将在 i2c_init 函数中通过 bus_register 函数进行注册


