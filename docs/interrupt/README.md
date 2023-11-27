# 中断和异常

中断通常被定义为一个事件，该事件改变处理器执行的指令顺序, 中断由间隔定时器和 I/O 设备产生的, 异常是由程序的错误产生的, 或者由内核必须处理的异常条件产生的

中断分为同步中断和异步中断

1. 同步中断(Inte微处理器称为异常)

同步中断是当指令执行时, 由 CPU 控制单元产生的, 之所以称为同步是因为只有在一条指令终止执行后 CPU 才会发出中断

2. 异步中断(Inte微处理器称为中断)

由其他硬件设备依照 CPU 时钟信号随机产生的


## 中断

### IRQ 数据结构

#### IRQ 描述符

```c

struct irq_desc {
    struct irq_common_data  irq_common_data;
    struct irq_data     irq_data;
    unsigned int __percpu   *kstat_irqs;
    irq_flow_handler_t  handle_irq;
    struct irqaction    *action;    /* IRQ action list */
    unsigned int        status_use_accessors;
    unsigned int        core_internal_state__do_not_mess_with_it;
    unsigned int        depth;      /* nested irq disables */
    unsigned int        wake_depth; /* nested wake enables */
    unsigned int        tot_count;
    unsigned int        irq_count;  /* For detecting broken IRQs */
    unsigned long       last_unhandled; /* Aging timer for unhandled count */
    unsigned int        irqs_unhandled;
    atomic_t        threads_handled;
    int         threads_handled_last;
    raw_spinlock_t      lock;
    struct cpumask      *percpu_enabled;
    const struct cpumask    *percpu_affinity;
#ifdef CONFIG_SMP
    const struct cpumask    *affinity_hint;
    struct irq_affinity_notify *affinity_notify;
#ifdef CONFIG_GENERIC_PENDING_IRQ
    cpumask_var_t       pending_mask;
#endif
#endif
    unsigned long       threads_oneshot;
    atomic_t        threads_active;
    wait_queue_head_t       wait_for_threads;
#ifdef CONFIG_PM_SLEEP
    unsigned int        nr_actions;
    unsigned int        no_suspend_depth;
    unsigned int        cond_suspend_depth;
    unsigned int        force_resume_depth;
#endif
#ifdef CONFIG_PROC_FS
    struct proc_dir_entry   *dir;
#endif
#ifdef CONFIG_GENERIC_IRQ_DEBUGFS
    struct dentry       *debugfs_file;
    const char      *dev_name;
#endif
#ifdef CONFIG_SPARSE_IRQ
    struct rcu_head     rcu;
    struct kobject      kobj;
#endif
    struct mutex        request_mutex;
    int         parent_irq;
    struct module       *owner;
    const char      *name;
#ifdef CONFIG_HARDIRQS_SW_RESEND
    struct hlist_node   resend_node;
#endif
} ____cacheline_internodealigned_in_smp;
```

#### irqaction 描述符

```c
struct irqaction {
    irq_handler_t       handler;
    void            *dev_id;
    void __percpu       *percpu_dev_id;
    struct irqaction    *next;
    irq_handler_t       thread_fn;
    struct task_struct  *thread;
    struct irqaction    *secondary;
    unsigned int        irq;
    unsigned int        flags;
    unsigned long       thread_flags;
    unsigned long       thread_mask;
    const char      *name;
    struct proc_dir_entry   *dir;
} ____cacheline_internodealigned_in_smp;
```

### 中断描述符表及初始化

中断描述符表(Interrupt Discription Table) 是一个系统表，它与每一个中断异常向量相关联,每个向量在表中有相应的中断或异常处理程序的入口地址

内核启用中断前, 必须通过 lidt 汇编指令把 IDT 表装到 idtr 寄存器， 并初始化并初始化表中的每一项, IDT 存放在 idt_table 表中, 有 256 个表项, 对应256 个中断号, 6 字节的idt_descr 变量指定了 IDT 的大小和它的地址


### 中断处理

#### I/O 中断

I/O 中断处理程序必须足够灵活以给多个设备同时提供服务，这部分由如下两种不同的方式实现

1. IRQ(Interrupt ReQuest) 共享

中断处理程序执行多个中断服务例程(interrupt service routine, ISR), 每个 ISR 是一个与单独设备(共享 ISR 线) 相关的函数，因为不可能预先知道哪个特定的设备产生 IRQ，因此 ISR 都被执行, 以验证它的设备是否需要关注(即产生的中断是不是要该 ISR 执行), 如果是，当设备产生中断时, 就执行需要执行的所有操作

2. IRQ 动态分派

一条 IRQ 线在可能的最后时刻才与一个设备驱动程序相关联

#### 时钟中断

#### 处理器间中断

### 软中断和 tasklet

软中断通常表示可延迟函数的所有种类, tasklet 是在软中断之上实现的, 软中断的分配是静态的(即编译时定义), tasklet 的分配和初始化可以在运行是进行，软中断可以并非地运行在多个 CPU 上, 因此，软中断是可重入函数而且必须明确地使用自旋锁保护其数据结构, 而同类型的 tasklet总是被串行的执行

中断上下文表示内核当前正在执行一个中断处理程序或一个可延迟函数, 中断上下文中不允许被阻塞或者进行进程切换

### 工作队列

可延迟函数运行在中断上下文中, 工作队列运行在进程上下文中

#### workqueue_struct 描述符

```c
struct workqueue_struct {
    struct list_head    pwqs;       /* WR: all pwqs of this wq */
    struct list_head    list;       /* PR: list of all workqueues */

    struct mutex        mutex;      /* protects this wq */
    int         work_color; /* WQ: current work color */
    int         flush_color;    /* WQ: current flush color */
    atomic_t        nr_pwqs_to_flush; /* flush in progress */
    struct wq_flusher   *first_flusher; /* WQ: first flusher */
    struct list_head    flusher_queue;  /* WQ: flush waiters */
    struct list_head    flusher_overflow; /* WQ: flush overflow list */

    struct list_head    maydays;    /* MD: pwqs requesting rescue */
    struct worker       *rescuer;   /* MD: rescue worker */

    int         nr_drainers;    /* WQ: drain in progress */
    int         saved_max_active; /* WQ: saved pwq max_active */

    struct workqueue_attrs  *unbound_attrs; /* PW: only for unbound wqs */
    struct pool_workqueue   *dfl_pwq;   /* PW: only for unbound wqs */

#ifdef CONFIG_SYSFS
    struct wq_device    *wq_dev;    /* I: for sysfs interface */
#endif
#ifdef CONFIG_LOCKDEP
    char            *lock_name;
    struct lock_class_key   key;
    struct lockdep_map  lockdep_map;
#endif
    char            name[WQ_NAME_LEN]; /* I: workqueue name */

    /*
     * Destruction of workqueue_struct is RCU protected to allow walking
     * the workqueues list without grabbing wq_pool_mutex.
     * This is used to dump all workqueues from sysrq.
     */
    struct rcu_head     rcu;

    /* hot fields used during command issue, aligned to cacheline */
    unsigned int        flags ____cacheline_aligned; /* WQ: WQ_* flags */
    struct pool_workqueue __percpu __rcu **cpu_pwq; /* I: per-cpu pwqs */
};
```

#### 工作队列操作

1. 创建工作队列

```c
struct workqueue_struct *alloc_workqueue(const char *fmt,
                     unsigned int flags,
                     int max_active, ...);

#define create_workqueue(name)                      \
    alloc_workqueue("%s", __WQ_LEGACY | WQ_MEM_RECLAIM, 1, (name))
```


2. 销毁工作队列

```c
void destroy_workqueue(struct workqueue_struct *wq)
```
