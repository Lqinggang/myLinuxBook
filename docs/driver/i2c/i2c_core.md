# I2C 核心

I2C 核心提供了一组不依赖与硬件平台的接口函数,  I2C 总线驱动和设备驱动之间以 I2C 核心作为纽带

## 增加/删除 i2c_adapter

### i2c_add_adapter

```c
/**
 * i2c_add_adapter - declare i2c adapter, use dynamic bus number
 * @adapter: the adapter to add
 * Context: can sleep
 *
 * This routine is used to declare an I2C adapter when its bus number
 * doesn't matter or when its bus number is specified by an dt alias.
 * Examples of bases when the bus number doesn't matter: I2C adapters
 * dynamically added by USB links or PCI plugin cards.
 *
 * When this returns zero, a new bus number was allocated and stored
 * in adap->nr, and the specified adapter became available for clients.
 * Otherwise, a negative errno value is returned.
 */
int i2c_add_adapter(struct i2c_adapter *adapter);
```

如上, 通过 i2c_add_adapter 函数定义和注册一个 i2c_adapter

### i2c_del_adapter

```c
/**
 * i2c_del_adapter - unregister I2C adapter
 * @adap: the adapter being unregistered
 * Context: can sleep
 *
 * This unregisters an I2C adapter which was previously registered
 * by @i2c_add_adapter or @i2c_add_numbered_adapter.
 */
void i2c_del_adapter(struct i2c_adapter *adap);
```

如上, 通过 i2c_del_adapter 去注册一个 i2c_adapter

## 增加/删除 i2c_driver

### i2c_register_driver

```c
/*
 * An i2c_driver is used with one or more i2c_client (device) nodes to access
 * i2c slave chips, on a bus instance associated with some i2c_adapter.
 */

int i2c_register_driver(struct module *owner, struct i2c_driver *driver);
```

如上, 通过 i2c_register_driver 函数注册一个 i2c 驱动, 这里需要指定所属的 module

### i2c_add_driver

```c
/* use a define to avoid include chaining to get THIS_MODULE */
#define i2c_add_driver(driver) \
    i2c_register_driver(THIS_MODULE, driver)
```

如上, 通过 i2c_add_driver 函数注册一个 i2c 驱动

### i2c_del_driver
```c
/**
 * i2c_del_driver - unregister I2C driver
 * @driver: the driver being unregistered
 * Context: can sleep
 */
void i2c_del_driver(struct i2c_driver *driver);
```

如上， i2c_del_driver 用于删除一个 i2c 驱动

## I2C传输、发送和接收

### i2c_transfer
```c
/**
 * i2c_transfer - execute a single or combined I2C message
 * @adap: Handle to I2C bus
 * @msgs: One or more messages to execute before STOP is issued to
 *  terminate the operation; each message begins with a START.
 * @num: Number of messages to be executed.
 *
 * Returns negative errno, else the number of messages executed.
 *
 * Note that there is no requirement that each message be sent to
 * the same slave address, although that is the most common model.
 */
int i2c_transfer(struct i2c_adapter *adap, struct i2c_msg *msgs, int num);
```

如上, 用于I2C适配器和I2C设备之间的一组消息的交互, i2c_master_send 和 i2c_msater_recv 最终都是通过这个函数实现

i2c_transfer 函数本身不具有驱动适配器物理硬件以完成消息交互的能力, 它只是寻找到与 i2c_adapter 对应的 i2c_algorithm， 并使用 i2c_algorithm 的 master_xfer 函数真正驱动硬件的流程

### i2c_master_send

```c
/**
 * i2c_master_send - issue a single I2C message in master transmit mode
 * @client: Handle to slave device
 * @buf: Data that will be written to the slave
 * @count: How many bytes to write, must be less than 64k since msg.len is u16
 *
 * Returns negative errno, or else the number of bytes written.
 */
static inline int i2c_master_send(const struct i2c_client *client,
                  const char *buf, int count)
{
    return i2c_transfer_buffer_flags(client, (char *)buf, count, 0);
};
```

如上, 用于向 I2C 从设备发送一个消息

### i2c_master_recv

```c
/**
 * i2c_master_recv - issue a single I2C message in master receive mode
 * @client: Handle to slave device
 * @buf: Where to store data read from slave
 * @count: How many bytes to read, must be less than 64k since msg.len is u16
 *
 * Returns negative errno, or else the number of bytes read.
 */
static inline int i2c_master_recv(const struct i2c_client *client,
                  char *buf, int count)
{
    return i2c_transfer_buffer_flags(client, buf, count, I2C_M_RD);
};
```

如上, 用于从 I2C 从设备接收一个消息
