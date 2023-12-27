# I2C 设备驱动

I2C 设备驱动要使用 i2c_driver 和 i2c_client 数据结构并填充 i2c_driver 中的成员函数

## I2C 设备驱动的加载和卸载

在[I2C 核心](./i2c_core.md)中，提供了 I2C 设备驱动程序模块加载和卸载函数，即 i2c_add_driver 和  i2c_del_driver 函数

一般而言, 为了更好的管理 i2c 设备驱动, 内核已经对 i2c 设备驱动进行了封装处理, 如 [platform 驱动](../platform/platform.md#platform_driver)也是对 struct device_driver 的封装一样

## I2C 设备驱动的数据传输

在 I2C 设备上读写数据的时序通常通过 i2c_msg 数组进行，最有通过 i2c_transfer() 完成
