# I2C 适配器

## I2C 适配器驱动的注册和注销

由于 I2C 总线控制器通常是在内存上, 所以它本身也连接在[platform 总线](../platform/platform.md#platform_bus)上, 要通过 platform_driver 和 platform_device 的匹配来执行


通常在与 I2C 适配器所对应的 platform_driver 的 probe() 函数中完成两个工作：

1. 初始化 I2C 适配器所使用的硬件资源, 如申请 I/O 地址、中断号、时钟等

2. 通过 i2c_add_adapter() 添加 i2c_adapter 的数据结构

通常在 platform_driver 的 remove() 函数完成与加载函数相反的工作:

1. 释放 I2C 适配器所使用的硬件资源

2. 通过 i2c_del_adapter 删除 i2c_adapter 的数据结构

## I2C 总线的通信方式

我们需要位特定的 I2C 适配器实现通信方法，主要实现 i2c_algorithm 的 functionality() 和 master_xfer() 函数

其中 functionality() 函数用于返回 algorithm 所支持的通信协议，如 I2C_FUNC_I2C、I2C_FUNC_10BIT_ADDR、I2C_FUNC_SMBUS_READ_TYPE、I2C_FUNC_SMBUS_WRITE_BYTE 等

master_xfer() 函数在 I2C 适配器上完成传递给它的 i2c_msg 数组中的每个 I2C 消息, 即完成发送消息给从设备的任务
