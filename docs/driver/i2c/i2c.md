# I2C 设备

I2C(内置集成电路) 总线通过时钟线SCL、数据线SDA这两根信号线实现设备之间数据的交互, I2C 总线支持多主控模式, 任何能够进行发送和接收的设备够可以成为主设备, 主控能够控制数据的传输和时钟频率, 在任意时刻只能由一个主控

对于I2C, 为了避免总线信号的混乱, 要求各设备连接到总线的输出端**必须是开漏输出或集电极开路输出的结构**

**I2C 总线空闲时, 上拉电阻使 SDA 和 SCL 都保持高电平状态**, 根据开漏输出或集电极开路输出信号的"线与"逻辑, I2C 总线上任意器件输出低电平都会使相应总线上的信号线变低

::: tip 说明
"线与"逻辑指的是两个或两个以上的输出直接互连就可实现"与"的逻辑功能, 只有输出端是开漏(对于CMOS器件)输出或集电极开路(对于TTL器件)输出时才满足此条件
:::

当 SCL 稳定在高电平时, SDA 由高到低(下降沿)产生一个起始位, 由低到高(上升沿)产生一个停止位, 起始位和停止位都是由I2C主设备产生

在选择从设备时, 如果从设备地址采用 7 位地址格式, 则主设备在发起传输过程前， 需先发送 1 字节的地址信息, 前 7 位为设备地址，最后 1 位为读写标志, 之后, 每次传输的数据也是 1 字节, 从 MSB 开始传输, 每个字节传送完后, 在 SCL 的第 9 个上升沿到来前, 接收方应该发出 1  个 ACK位, SCL 上的时钟脉冲由 I2C 主控方发出, 在第 8 个时钟周期之后, 主控方应该释放 SDA(为了从设备返回 ACK)

如下，是 I2C 总线的时序图, 在编写 I2C 驱动的时候将围绕这个时序图展开



I2C 驱动由 3 个部分组成, 即 I2C 核心、I2C 总线驱动以及 I2C 设备驱动

## I2C 核心

I2C 核心提供了 I2C 总线驱动和设备驱动的注册、注销方法，I2C 通信方法上层的与具体适配器无关的代码以及探测设备、检测设备地址的上层代码等

## I2C 总线驱动

I2C 总线驱动是对 I2C 硬件体系结构中适配器端的实现，适配器可由 CPU 控制，甚至可直接集成在 CPU 内部

I2C 总线驱动主要包含了 I2C 适配器数据结构 i2c_adapter、I2C 适配器的 Algorithm 数据结构 i2c_algorithm 和控制 I2C 适配器产生通信信号的函数

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

### i2c\_adapter

```c
/*
 * i2c_adapter is the structure used to identify a physical i2c bus along
 * with the access algorithms necessary to access it.
 */
struct i2c_adapter {
    struct module *owner;
    unsigned int class;       /* classes to allow probing for */
    const struct i2c_algorithm *algo; /* the algorithm to access the bus */
    void *algo_data;

    /* data fields that are valid for all devices   */
    const struct i2c_lock_operations *lock_ops;
    struct rt_mutex bus_lock;
    struct rt_mutex mux_lock;

    int timeout;            /* in jiffies */
    int retries;
    struct device dev;      /* the adapter device */
    unsigned long locked_flags; /* owned by the I2C core */
#define I2C_ALF_IS_SUSPENDED        0
#define I2C_ALF_SUSPEND_REPORTED    1

    int nr;
    char name[48];
    struct completion dev_released;

    struct mutex userspace_clients_lock;
    struct list_head userspace_clients;

    struct i2c_bus_recovery_info *bus_recovery_info;
    const struct i2c_adapter_quirks *quirks;

    struct irq_domain *host_notify_domain;
    struct regulator *bus_regulator;
};
#define to_i2c_adapter(d) container_of(d, struct i2c_adapter, dev)
```

如上, 是 i2c 适配器结构体, 其对应于物理上的一个适配器

### i2c\_algorithm

```c
/**
 * struct i2c_algorithm - represent I2C transfer method
 * @master_xfer: Issue a set of i2c transactions to the given I2C adapter
 *   defined by the msgs array, with num messages available to transfer via
 *   the adapter specified by adap.
 * @master_xfer_atomic: same as @master_xfer. Yet, only using atomic context
 *   so e.g. PMICs can be accessed very late before shutdown. Optional.
 * @smbus_xfer: Issue smbus transactions to the given I2C adapter. If this
 *   is not present, then the bus layer will try and convert the SMBus calls
 *   into I2C transfers instead.
 * @smbus_xfer_atomic: same as @smbus_xfer. Yet, only using atomic context
 *   so e.g. PMICs can be accessed very late before shutdown. Optional.
 * @functionality: Return the flags that this algorithm/adapter pair supports
 *   from the ``I2C_FUNC_*`` flags.
 * @reg_slave: Register given client to I2C slave mode of this adapter
 * @unreg_slave: Unregister given client from I2C slave mode of this adapter
 *
 * The following structs are for those who like to implement new bus drivers:
 * i2c_algorithm is the interface to a class of hardware solutions which can
 * be addressed using the same bus algorithms - i.e. bit-banging or the PCF8584
 * to name two of the most common.
 *
 * The return codes from the ``master_xfer{_atomic}`` fields should indicate the
 * type of error code that occurred during the transfer, as documented in the
 * Kernel Documentation file Documentation/i2c/fault-codes.rst. Otherwise, the
 * number of messages executed should be returned.
 */
struct i2c_algorithm {
    /*
     * If an adapter algorithm can't do I2C-level access, set master_xfer
     * to NULL. If an adapter algorithm can do SMBus access, set
     * smbus_xfer. If set to NULL, the SMBus protocol is simulated
     * using common I2C messages.
     *
     * master_xfer should return the number of messages successfully
     * processed, or a negative value on error
     */
    int (*master_xfer)(struct i2c_adapter *adap, struct i2c_msg *msgs, int num);    /* 用于产生I2C访问周期需要的信号 */
    int (*master_xfer_atomic)(struct i2c_adapter *adap, struct i2c_msg *msgs, int num);
    int (*smbus_xfer)(struct i2c_adapter *adap, u16 addr, unsigned short flags, char read_write, u8 command, int size, union i2c_smbus_data *data);
    int (*smbus_xfer_atomic)(struct i2c_adapter *adap, u16 addr, unsigned short flags, char read_write,
    /* To determine what the adapter supports */
    u32 (*functionality)(struct i2c_adapter *adap);

#if IS_ENABLED(CONFIG_I2C_SLAVE)
    int (*reg_slave)(struct i2c_client *client);
    int (*unreg_slave)(struct i2c_client *client);
#endif
};
```

如上, 是 i2c_algorithm  结构体，I2C 适配器通过 i2c_algorithm 提供的通信函数来控制适配器产生特定的访问周期

### i2c\_msg

```c
/**
 * struct i2c_msg - an I2C transaction segment beginning with START
 *
 * @addr: Slave address, either 7 or 10 bits. When this is a 10 bit address,
 *   %I2C_M_TEN must be set in @flags and the adapter must support
 *   %I2C_FUNC_10BIT_ADDR.
 *
 * @flags:
 *   Supported by all adapters:
 *   %I2C_M_RD: read data (from slave to master). Guaranteed to be 0x0001!
 *
 *   Optional:
 *   %I2C_M_DMA_SAFE: the buffer of this message is DMA safe. Makes only sense
 *     in kernelspace, because userspace buffers are copied anyway
 *
 *   Only if I2C_FUNC_10BIT_ADDR is set:
 *   %I2C_M_TEN: this is a 10 bit chip address
 *
 *   Only if I2C_FUNC_SMBUS_READ_BLOCK_DATA is set:
 *   %I2C_M_RECV_LEN: message length will be first received byte
 *
 *   Only if I2C_FUNC_NOSTART is set:
 *   %I2C_M_NOSTART: skip repeated start sequence

 *   Only if I2C_FUNC_PROTOCOL_MANGLING is set:
 *   %I2C_M_NO_RD_ACK: in a read message, master ACK/NACK bit is skipped
 *   %I2C_M_IGNORE_NAK: treat NACK from client as ACK
 *   %I2C_M_REV_DIR_ADDR: toggles the Rd/Wr bit
 *   %I2C_M_STOP: force a STOP condition after the message
 *
 * @len: Number of data bytes in @buf being read from or written to the I2C
 *   slave address. For read transactions where %I2C_M_RECV_LEN is set, the
 *   caller guarantees that this buffer can hold up to %I2C_SMBUS_BLOCK_MAX
 *   bytes in addition to the initial length byte sent by the slave (plus,
 *   if used, the SMBus PEC); and this value will be incremented by the number
 *   of block data bytes received.
 *
 * @buf: The buffer into which data is read, or from which it's written.
 *
 * An i2c_msg is the low level representation of one segment of an I2C
 * transaction.  It is visible to drivers in the @i2c_transfer() procedure,
 * to userspace from i2c-dev, and to I2C adapter drivers through the
 * @i2c_adapter.@master_xfer() method.
 *
 * Except when I2C "protocol mangling" is used, all I2C adapters implement
 * the standard rules for I2C transactions.  Each transaction begins with a
 * START.  That is followed by the slave address, and a bit encoding read
 * versus write.  Then follow all the data bytes, possibly including a byte
 * with SMBus PEC.  The transfer terminates with a NAK, or when all those
 * bytes have been transferred and ACKed.  If this is the last message in a
 * group, it is followed by a STOP.  Otherwise it is followed by the next
 * @i2c_msg transaction segment, beginning with a (repeated) START.
 *
 * Alternatively, when the adapter supports %I2C_FUNC_PROTOCOL_MANGLING then
 * passing certain @flags may have changed those standard protocol behaviors.
 * Those flags are only for use with broken/nonconforming slaves, and with
 * adapters which are known to support the specific mangling options they need.
 */
struct i2c_msg {
    __u16 addr;
    __u16 flags;
#define I2C_M_RD        0x0001  /* guaranteed to be 0x0001! */
#define I2C_M_TEN       0x0010  /* use only if I2C_FUNC_10BIT_ADDR */
#define I2C_M_DMA_SAFE      0x0200  /* use only in kernel space */
#define I2C_M_RECV_LEN      0x0400  /* use only if I2C_FUNC_SMBUS_READ_BLOCK_DATA */
#define I2C_M_NO_RD_ACK     0x0800  /* use only if I2C_FUNC_PROTOCOL_MANGLING */
#define I2C_M_IGNORE_NAK    0x1000  /* use only if I2C_FUNC_PROTOCOL_MANGLING */
#define I2C_M_REV_DIR_ADDR  0x2000  /* use only if I2C_FUNC_PROTOCOL_MANGLING */
#define I2C_M_NOSTART       0x4000  /* use only if I2C_FUNC_NOSTART */
#define I2C_M_STOP      0x8000  /* use only if I2C_FUNC_PROTOCOL_MANGLING */
    __u16 len;
    __u8 *buf;
};
```

如上， 是 i2c 消息结构体, i2c 核心中, 通过收发该结构体数据来完成 i2c 设备间数据的交互

## I2C 设备驱动

I2C 设备驱动是对 I2C 硬件体系结构中设备端的实现，设备一般挂接在受 CPU 控制的 I2C 适配器上, 通过 I2C 适配器与 CPU 交换数据

I2C 设备驱动主要包含 i2c_driver 和 i2c_client

### i2c\_driver

```c

/**
 * struct i2c_driver - represent an I2C device driver
 * @class: What kind of i2c device we instantiate (for detect)
 * @probe: Callback for device binding
 * @remove: Callback for device unbinding
 * @shutdown: Callback for device shutdown
 * @alert: Alert callback, for example for the SMBus alert protocol
 * @command: Callback for bus-wide signaling (optional)
 * @driver: Device driver model driver
 * @id_table: List of I2C devices supported by this driver
 * @detect: Callback for device detection
 * @address_list: The I2C addresses to probe (for detect)
 * @clients: List of detected clients we created (for i2c-core use only)
 * @flags: A bitmask of flags defined in &enum i2c_driver_flags
 *
 * The driver.owner field should be set to the module owner of this driver.
 * The driver.name field should be set to the name of this driver.
 *
 * For automatic device detection, both @detect and @address_list must
 * be defined. @class should also be set, otherwise only devices forced
 * with module parameters will be created. The detect function must
 * fill at least the name field of the i2c_board_info structure it is
 * handed upon successful detection, and possibly also the flags field.
 *
 * If @detect is missing, the driver will still work fine for enumerated
 * devices. Detected devices simply won't be supported. This is expected
 * for the many I2C/SMBus devices which can't be detected reliably, and
 * the ones which can always be enumerated in practice.
 *
 * The i2c_client structure which is handed to the @detect callback is
 * not a real i2c_client. It is initialized just enough so that you can
 * call i2c_smbus_read_byte_data and friends on it. Don't do anything
 * else with it. In particular, calling dev_dbg and friends on it is
 * not allowed.
 */
struct i2c_driver {
    unsigned int class;

    /* Standard driver model interfaces */
    int (*probe)(struct i2c_client *client);
    void (*remove)(struct i2c_client *client);


    /* driver model interfaces that don't relate to enumeration  */
    void (*shutdown)(struct i2c_client *client);
    /* Alert callback, for example for the SMBus alert protocol.
     * The format and meaning of the data value depends on the protocol.
     * For the SMBus alert protocol, there is a single bit of data passed
     * as the alert response's low bit ("event flag").
     * For the SMBus Host Notify protocol, the data corresponds to the
     * 16-bit payload data reported by the slave device acting as master.
     */
    void (*alert)(struct i2c_client *client, enum i2c_alert_protocol protocol,
              unsigned int data);

    /* a ioctl like command that can be used to perform specific functions
     * with the device.
     */
    int (*command)(struct i2c_client *client, unsigned int cmd, void *arg);

    struct device_driver driver;
    const struct i2c_device_id *id_table;

    /* Device detection callback for automatic device creation */
    int (*detect)(struct i2c_client *client, struct i2c_board_info *info);
    const unsigned short *address_list;
    struct list_head clients;

    u32 flags;
};
#define to_i2c_driver(d) container_of(d, struct i2c_driver, driver)
```

如上, 是 I2C 驱动结构体

### i2c\_client

```c
/**
 * struct i2c_client - represent an I2C slave device
 * @flags: see I2C_CLIENT_* for possible flags
 * @addr: Address used on the I2C bus connected to the parent adapter.
 * @name: Indicates the type of the device, usually a chip name that's
 *  generic enough to hide second-sourcing and compatible revisions.
 * @adapter: manages the bus segment hosting this I2C device
 * @dev: Driver model device node for the slave.
 * @init_irq: IRQ that was set at initialization
 * @irq: indicates the IRQ generated by this device (if any)
 * @detected: member of an i2c_driver.clients list or i2c-core's
 *  userspace_devices list
 * @slave_cb: Callback when I2C slave mode of an adapter is used. The adapter
 *  calls it to pass on slave events to the slave driver.
 * @devres_group_id: id of the devres group that will be created for resources
 *  acquired when probing this device.
 *
 * An i2c_client identifies a single device (i.e. chip) connected to an
 * i2c bus. The behaviour exposed to Linux is defined by the driver
 * managing the device.
 */
struct i2c_client {
    unsigned short flags;       /* div., see below      */
#define I2C_CLIENT_PEC      0x04    /* Use Packet Error Checking */
#define I2C_CLIENT_TEN      0x10    /* we have a ten bit chip address */
                    /* Must equal I2C_M_TEN below */
#define I2C_CLIENT_SLAVE    0x20    /* we are the slave */
#define I2C_CLIENT_HOST_NOTIFY  0x40    /* We want to use I2C host notify */
#define I2C_CLIENT_WAKE     0x80    /* for board_info; true iff can wake */
#define I2C_CLIENT_SCCB     0x9000  /* Use Omnivision SCCB protocol */
                    /* Must match I2C_M_STOP|IGNORE_NAK */

    unsigned short addr;        /* chip address - NOTE: 7bit    */
                    /* addresses are stored in the  */
                    /* _LOWER_ 7 bits       */
    char name[I2C_NAME_SIZE];
    struct i2c_adapter *adapter;    /* the adapter we sit on    */
    struct device dev;      /* the device structure     */
    int init_irq;           /* irq set at initialization    */
    int irq;            /* irq issued by device     */
    struct list_head detected;
#if IS_ENABLED(CONFIG_I2C_SLAVE)
    i2c_slave_cb_t slave_cb;    /* callback for slave mode  */
#endif
    void *devres_group_id;      /* ID of probe devres group */
};
#define to_i2c_client(d) container_of(d, struct i2c_client, dev)
```

如上, i2c_client 对应于真实的物理设备, 每个 I2C 设备都需要一个 i2c_client 来描述, 一个 i2c_client 依附于 i2c_adapter


## I2C 驱动实现的主要工作

1. 提供 I2C 适配器的硬件驱动，探测、初始化 I2C 适配器、驱动 CPU 控制的 I2C 适配器从硬件上产生各种信号以及处理 I2C 中断等

2. 提供 I2C 适配器的 algorightm。 用于具体适配器的 xxx_xfer() 函数填充 i2c_algorithm 的 master_xfer 指针，并把 i2c_algorithm 指针赋值给 i2c_adapter 的 algo 指针

3. 实现 I2C 设备驱动中 i2c_driver 接口。 用具体设备探测(probe)、移除(remove)、挂起(suspend)和恢复(resume)的函数指针和 i2c_device_id 设备 ID 表赋值给 i2c_driver 的 probe、remove、suspend、resume和 id_table 指针

4. 实现 I2C 设备所对应类型的具体驱动。i2c_driver 只是实现设备与总线的挂接
