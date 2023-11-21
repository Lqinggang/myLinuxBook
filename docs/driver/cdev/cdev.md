# 字符设备驱动

字符设备驱动详细处理流程请查看[字符设备驱动详解](./cdev_details.md)

## 字符设备结构体

```c
struct cdev {
    struct kobject kobj;
    struct module *owner;
    const struct file_operations *ops;
    struct list_head list;
    dev_t dev;
    unsigned int count;
} __randomize_layout;
```

| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| kobj       | 内嵌的 kobject, 用于计数等 |
| owner      | 指向实现驱动程序的模块  |
| ops        | 指向设备驱动程序文件操作表的指针 |
| list       | 与字符设备文件对应的索引节点链表的头 |
| dev        | 给设备驱动程序所分配的初始主设备号和次设备号 |
| count      | 给设备驱动程序分配的设备号范围的大小 |


## 字符设备号分配和释放

<div id="chrdevs"/>

为了记录目前已分配了哪些字符设备号, 内核使用散列表 chrdevs, 表的大小不超过设备号范围

```c
static DEFINE_MUTEX(chrdevs_lock); /* 用于保护 chrdevs 散列表 */

#define CHRDEV_MAJOR_HASH_SIZE 255

static struct char_device_struct {
    struct char_device_struct *next;
    unsigned int major;
    unsigned int baseminor;
    int minorct;
    char name[64];
    struct cdev *cdev;      /* will die */
} *chrdevs[CHRDEV_MAJOR_HASH_SIZE]; /* 下标表示字符设备的主设备号 */
```

| 字段       | 说明                                                |
| ---------- | ----------------------------------------------------|
| next       | 字符设备结构体链表, 这里对应的是次设备的链表 |
| major      | 字符设备主设备号 |
| baseminor  | 字符设备起始次设备号 |
| minorct    | 次设备号的数量 |
| name       | 字符设备名称 |
| cdev       | 注册的字符设备 |




### 固定分配设备号

```c
int register_chrdev_region(dev_t dev, unsigned count, const char *name);
```

register_chrdev_region 函数检查请求的设备号范围是否跨越一些次设备号, 如果是, 则确定其主设备号以及覆盖整个区间的相应设备号范围

|   参数 |    说明  |
|  ----- | ---------- |
|  dev   |  初始化的设备号 |
| count  | 请求的设备号范围大小  |
| name | 设备号对应的设备驱动程序的名称 |

register_chrdev 函数分配一个固定的主设备号以及0 - 255 的次设备号

### 动态分配设备号

```c
int alloc_chrdev_region(dev_t *dev, unsigned baseminor, unsigned count, const char *name);
```
alloc_chrdev_region 函数动态的分配一个主设备号

|   参数 |    说明  |
|  ----- | ---------- |
|  dev   |  分配的设备号(输出值) |
| baseminor | 请求的次设备号范围的起始值 |
| count  | 请求的次设备号范围大小 |
| name | 设备号对应的设备驱动程序的名称 |

### 字符设备号的释放

```c
void unregister_chrdev_region(dev_t from, unsigned count);
```

不管是使用固定分配还是动态分配设备号, 都需要通过 unregister_chrdev_region 函数释放分配的设备号

## 字符设备的分配和初始化

```c
struct cdev *cdev_alloc(void);
void cdev_init(struct cdev *cdev, struct file_operations *fops);
```
cdev_alloc 函数用于动态分配一个 cdev 描述符,  并初始化内嵌的 kobject 数据结构体

cdev_init 函数用于对字符设备进行初始化, 并建立字符设备和文件操作表之间的连接


## 字符设备注册和移除

### 推荐的方法
```c
int cdev_add(struct cdev *p, dev_t dev, unsigned count);
void cdev_del(struct cdev *dev);
```
cdev_add 函数用于向[Linux 设备驱动模型](./model.md)中注册一个 cdev 描述符，设备驱动模型为字符设备定义了一个 kobject 映射域, 该映射域由一个 kobj_map 类型的描述符描述, 并由全局变量 **cdev_map** 引用, kobj_map 描述符包括类一个散列表, 有 255 个表现, 并由0 - 255 范围的主设备号进行索引

|   参数 |    说明  |
|  ----- | ---------- |
|  p |  要注册的字符设备 |
| dev | 注册的字符设备的设备号起始值 |
| count  | 向Linux驱动模型注册的字符设备的次设备数 |




cdev_del 函数用于从Linux 设备驱动模型中移除一个字符设备


### 早期的方法

```c
int register_chrdev(unsigned int major, const char *name, const struct file_operations *fops);
int unregister_chrdev(unsigned int major, const char *name);
```

以上两个函数是Linux早期版本, 用于注册或注销字符设备的函数, 包含了字符设备号的分配和初始化等步骤，现在不推荐使用

## 字符设备注册和销毁一般步骤

综上, 字符设备注册的一般步骤如下:

1. 申请一个字符设备号

2. 申请一个字符设备

3. 向Linux 设备模型中注册该字符设备

字符设备销毁的一般步骤如下:

1. 从Linux 设备模型中移除字符设备

2. 释放申请的字符设备号


## 示例

### 示例1

```c
static const struct file_operations gio_fops = {
    .owner = THIS_MODULE,
    .open = gio_open,   /* open */
    .release = gio_close,   /* release */
    .unlocked_ioctl = gio_ioctl,
    .llseek = noop_llseek,
};

static int __init gio_init(void)
{
    int error;

    printk(KERN_INFO "gio: driver initialized\n");

    openCnt = 0;

    /* 动态申请字符设备号 */
    if ((error = alloc_chrdev_region(&dev, 0, DEVCOUNT, "gio")) < 0) {
        printk(KERN_ERR
               "gio: Couldn't alloc_chrdev_region, error=%d\n",
               error);
        return 1;
    }

    /* 申请字符设备 */
    cdev_p = cdev_alloc();

    /* 链接字符设备与文件操作表, 这里可以使用cdev_init函数进行替换: cdev_init(cdev_p, &gpio_fops);  */
    cdev_p->ops = &gio_fops;

    /* 向Linux驱动模型注册字符设备 */
    error = cdev_add(cdev_p, dev, DEVCOUNT);
    if (error) {
        printk(KERN_ERR
               "gio: Couldn't cdev_add, error=%d\n", error);
        return 1;
    }

    return 0;
}

static void __exit gio_exit(void)
{
    /* 从Linux驱动模型中移除字符设备 */
    cdev_del(cdev_p);

    /* 释放字符设备号 */
    unregister_chrdev_region(dev, DEVCOUNT);
}
```


### 示例2


```c
static const struct file_operations nvdimm_fops = {
    .owner = THIS_MODULE,
    .open = nd_open,
    .unlocked_ioctl = dimm_ioctl,
    .compat_ioctl = compat_ptr_ioctl,
    .llseek = noop_llseek,
};

int __init nvdimm_bus_init(void)
{
    int rc;

    rc = bus_register(&nvdimm_bus_type);
    if (rc)
        return rc;

    /* 注册字符设备 */
    rc = register_chrdev(0, "ndctl", &nvdimm_bus_fops);
    if (rc < 0)
        goto err_bus_chrdev;
    nvdimm_bus_major = rc;

    /* 注册字符设备 */
    rc = register_chrdev(0, "dimmctl", &nvdimm_fops);
    if (rc < 0)
        goto err_dimm_chrdev;
    nvdimm_major = rc;

    nd_class = class_create(THIS_MODULE, "nd");
    if (IS_ERR(nd_class)) {
        rc = PTR_ERR(nd_class);
        goto err_class;
    }

    rc = driver_register(&nd_bus_driver.drv);
    if (rc)
        goto err_nd_bus;

    return 0;

 err_nd_bus:
    class_destroy(nd_class);
 err_class:
    unregister_chrdev(nvdimm_major, "dimmctl");
 err_dimm_chrdev:
    unregister_chrdev(nvdimm_bus_major, "ndctl");
 err_bus_chrdev:
    bus_unregister(&nvdimm_bus_type);

    return rc;
}

void nvdimm_bus_exit(void)
{
    driver_unregister(&nd_bus_driver.drv);
    class_destroy(nd_class);
    /* 释放字符设备 */
    unregister_chrdev(nvdimm_bus_major, "ndctl");
    /* 释放字符设备 */
    unregister_chrdev(nvdimm_major, "dimmctl");
    bus_unregister(&nvdimm_bus_type);
    ida_destroy(&nd_ida);
}
```
