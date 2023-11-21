# 字符设备驱动详解

## 内核的启动

Linux 内核通过 start_kernel() 函数开始启动, 该函数包含在 init/main.c 中

```c
asmlinkage __visible void __init __no_sanitize_address start_kernel(void)
{
    ....

    vfs_caches_init();

    ...
}
```


## vfs_caches_init 函数

在 start_kernel 函数中, 会调用 vfs_caches_init() 函数初始化 [VFS 虚拟文件系统](../fs/README.md)

```c
void __init vfs_caches_init(void)
[
    ...

    chrdev_init();

    ...
}
```

<div id="chrdev_init"/>

## chrdev_init 函数

这里会调用 kobj_map_init 函数初始化字符设备的 kobj 映射结构体 cdev_map, 如下

```c
void __init chedev_init(void)
{
    cdev_map = kobj_map_init(base_probe, &chrdevs_lock);
}
```

其中 cdev_map 为 struct kobj_map 类型, 定义为

```c
struct kobj_map {
    struct probe {
        struct probe *next;
        dev_t dev;
        unsigned long range;
        struct module *owner;
        kobj_probe_t *get;
        int (*lock)(dev_t, void *);
        void *data;
    } *probes[255]; /* 最多255个主设备号 */
    struct mutex *lock;
};
```

其中, base_probe 将赋值给  cdev_map->probes[i].get(0 &lt;= i &lt; 255), 静态声明的 chrdevs_lock 赋值给 cdev_map->lock


## alloc_chrdev_region 函数

alloc_chrdev_region 函数动态的分配一个主设备号, 其实现如下

```c
/**
 * alloc_chrdev_region() - register a range of char device numbers
 * @dev: output parameter for first assigned number
 * @baseminor: first of the requested range of minor numbers
 * @count: the number of minor numbers required
 * @name: the name of the associated device or driver
 *
 * Allocates a range of char device numbers.  The major number will be
 * chosen dynamically, and returned (along with the first minor number)
 * in @dev.  Returns zero or a negative error code.
 */
int alloc_chrdev_region(dev_t *dev, unsigned baseminor, unsigned count,
            const char *name)
{
    struct char_device_struct *cd;
    cd = __register_chrdev_region(0, baseminor, count, name);
    if (IS_ERR(cd))
        return PTR_ERR(cd);
    *dev = MKDEV(cd->major, cd->baseminor);
    return 0;
}
```

这里调用 __register_chrdev_region 函数申请指定数量的字符设备, 然后将其与 [chrdevs 散列表](./cdev.md#chrdevs)找到的没有使用字符设备进行绑定(指针赋值)

## cdev_alloc 函数

cdev_alloc 函数用于动态申请一个 cdev 描述符,  然后初始化内嵌的 kobject 数据结构体, 其实现如下

```c
/**
 * cdev_alloc() - allocate a cdev structure
 *
 * Allocates and returns a cdev structure, or NULL on failure.
 */
struct cdev *cdev_alloc(void)
{
    struct cdev *p = kzalloc(sizeof(struct cdev), GFP_KERNEL);
    if (p) {
        INIT_LIST_HEAD(&p->list);
        kobject_init(&p->kobj, &ktype_cdev_dynamic);
    }
    return p;
}
```

## cdev_init 函数


cdev_init 函数用于对申请到的字符设备进行初始化, 并建立字符设备和文件操作表之间的连接, 其实现如下

```c
/**
 * cdev_init() - initialize a cdev structure
 * @cdev: the structure to initialize
 * @fops: the file_operations for this device
 *
 * Initializes @cdev, remembering @fops, making it ready to add to the
 * system with cdev_add().
 */
void cdev_init(struct cdev *cdev, const struct file_operations *fops)
{
    memset(cdev, 0, sizeof *cdev);
    INIT_LIST_HEAD(&cdev->list);
    kobject_init(&cdev->kobj, &ktype_cdev_default);
    cdev->ops = fops;
}
```

## cdev_add 函数

cdev_add 函数用于向[Linux 设备驱动模型](./model.md)中注册一个 cdev 描述符

```c
/**
 * cdev_add() - add a char device to the system
 * @p: the cdev structure for the device
 * @dev: the first device number for which this device is responsible
 * @count: the number of consecutive minor numbers corresponding to this
 *         device
 *
 * cdev_add() adds the device represented by @p to the system, making it
 * live immediately.  A negative error code is returned on failure.
 */
int cdev_add(struct cdev *p, dev_t dev, unsigned count)
{
    int error;

    p->dev = dev;
    p->count = count;

    if (WARN_ON(dev == WHITEOUT_DEV))
        return -EBUSY;

    error = kobj_map(cdev_map, dev, count, NULL,
             exact_match, exact_lock, p);
    if (error)
        return error;

    kobject_get(p->kobj.parent);

    return 0;
}
```

其中, cdev_map 在 [chrdev_init 函数](#chrdev_init)中初始化, 执行完转之后, dev 对应的主设备号开始的count个设备将链接到 cdev_map, 此时就可以从 cdev_map 中找到已经打开/申请的设备

## kobj_map 函数

```c
int kobj_map(struct kobj_map *domain, dev_t dev, unsigned long range,
         struct module *module, kobj_probe_t *probe,
         int (*lock)(dev_t, void *), void *data)
{
    unsigned n = MAJOR(dev + range - 1) - MAJOR(dev) + 1; /* 求取主设备的数量?? */
    unsigned index = MAJOR(dev);
    unsigned i;
    struct probe *p;

    if (n > 255)
        n = 255;

    /* 申请 n 个 sizeof(struct probe) 大小的空间 */
    p = kmalloc_array(n, sizeof(struct probe), GFP_KERNEL);
    if (p == NULL)
        return -ENOMEM;

    /* probe 结构体赋值 */
    for (i = 0; i < n; i++, p++) {
        p->owner = module;
        p->get = probe;
        p->lock = lock;
        p->dev = dev;
        p->range = range;
        p->data = data;
    }

    /* 插入散列表 */
    mutex_lock(domain->lock);
    for (i = 0, p -= n; i < n; i++, p++, index++) {
        struct probe **s = &domain->probes[index % 255];
        /* 找到第一个比range大的probes */
        while (*s && (*s)->range < range)
            s = &(*s)->next;
        p->next = *s;
        *s = p;
    }
    mutex_unlock(domain->lock);
    return 0;
}
```


## 文件操作表

如下是, 字符设备默认的文件操作表, 该文件操作表将在 init_special_inode 函数中， 当打开的设备是字符设备时, 被赋值给 inode 对应的文件操作表

```c
/*
 * Dummy default file-operations: the only thing this does
 * is contain the open that then fills in the correct operations
 * depending on the special file...
 */
const struct file_operations def_chr_fops = {
    .open = chrdev_open,
    .llseek = noop_llseek,
};
```


## 字符设备的打开

如上, 当一个字符设备被打开的时候, 将执行 chrdev_open 函数, 其定义如下

```c
/*
 * Called every time a character special file is opened
 */
static int chrdev_open(struct inode *inode, struct file *filp)
{
    const struct file_operations *fops;
    struct cdev *p;
    struct cdev *new = NULL;
    int ret = 0;

    spin_lock(&cdev_lock);
    p = inode->i_cdev;
    if (!p) {
        struct kobject *kobj;
        int idx;
        spin_unlock(&cdev_lock);

        /* 从 cdev_map 找到对应的字符设备, cdev_map 在 chrdev_init 函数中并初始化, 而字符设备通过 cdev_add 添加到 cdev_map 中 */
        kobj = kobj_lookup(cdev_map, inode->i_rdev, &idx);
        if (!kobj)
            return -ENXIO;

        new = container_of(kobj, struct cdev, kobj);
        spin_lock(&cdev_lock);
        /* Check i_cdev again in case somebody beat us to it while
           we dropped the lock. */
        p = inode->i_cdev;
        if (!p) {
            inode->i_cdev = p = new;
            list_add(&inode->i_devices, &p->list);
            new = NULL;
        } else if (!cdev_get(p))
            ret = -ENXIO;
    } else if (!cdev_get(p))
        ret = -ENXIO;
    spin_unlock(&cdev_lock);
    cdev_put(new);
    if (ret)
        return ret;

    ret = -ENXIO;
    fops = fops_get(p->ops);
    if (!fops)
        goto out_cdev_put;

    /* 替换文件操作表, 这里的 fops 对应的是 cdev_init 函数初始化时的文件操作表 */
    replace_fops(filp, fops);
    if (filp->f_op->open) {
        /* 使用字符设备指定的文件操作表中的open回调函数打开字符设备 */
        ret = filp->f_op->open(inode, filp);
        if (ret)
            goto out_cdev_put;
    }

    return 0;

 out_cdev_put:
    cdev_put(p);
    return ret;
}
```

具体字符设备的相关文件操作请参考[VFS 虚拟文件系统](../../fs/README.md)
