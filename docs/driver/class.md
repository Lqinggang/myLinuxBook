# Linux 类对象

类是一个设备的高层视图, 它抽象了底层的实现细节, 几乎所有的类对象都属于与 /sys/class 目录相对应的 class_subsys 子系统

```c
struct class {
    const char      *name;
    struct module       *owner;

    const struct attribute_group    **class_groups;
    const struct attribute_group    **dev_groups;
    struct kobject          *dev_kobj;

    int (*dev_uevent)(struct device *dev, struct kobj_uevent_env *env);
    char *(*devnode)(struct device *dev, umode_t *mode);

    void (*class_release)(struct class *class);
    void (*dev_release)(struct device *dev);

    int (*shutdown_pre)(struct device *dev);

    const struct kobj_ns_type_operations *ns_type;
    const void *(*namespace)(struct device *dev);

    void (*get_ownership)(struct device *dev, kuid_t *uid, kgid_t *gid);

    const struct dev_pm_ops *pm;

    struct subsys_private *p;
};
```


## 类对象的注册和销毁

```c
int class_register(struct class *cls);
void class_unregister(struct class *cls);
```
