# Linux 类对象


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

