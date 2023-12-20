# 通用文件模型

通用文件模型可以理解为面向对象的, 对于上层应用, 调用的都是同一个方法，比如read, write, open 等, 在底层实现上, 会根据不同的设备执行对应的操作, 这部分通过函数指针来实现, 对于不同部分全部采用函数指针的形式定义, 上层执行请求之后VFS执行指定请求对应的回调函数


## 通用文件模型对象

通用文件模型由如下对象组成

1. 超级块对象

存放已安装文件系统的有关信息. 对于基于磁盘的文件系统, 这类对象通常对应于存放在磁盘上的文件系统控制块

2. 索引节点对象

存放关于具体文件的一般信息. 对于基于磁盘的文件系统，这类对象通常对应于存放在磁盘上的文件控制块，每个索引节点对象都有一个索引节点，这个节点号唯一地标识文件系统中的文件

3. 文件对象

存放打开文件与进程之间进行交互的有关信息，这类信息仅当进程访问文件期间存在于内核内存中

4. 目录对象

存放目录项(也就是文件的特定名称)与对应文件进程链接的有关信息，每个磁盘文件系统都以自己特有的方式将该类信息存放在磁盘上


### 超级块对象

```c
struct super_block {
    struct list_head    s_list;     /* Keep this first */
    dev_t           s_dev;      /* search index; _not_ kdev_t */
    unsigned char       s_blocksize_bits;
    unsigned long       s_blocksize;
    loff_t          s_maxbytes; /* Max file size */
    struct file_system_type *s_type;
    const struct super_operations   *s_op;
    const struct dquot_operations   *dq_op;
    const struct quotactl_ops   *s_qcop;
    const struct export_operations *s_export_op;
    unsigned long       s_flags;
    unsigned long       s_iflags;   /* internal SB_I_* flags */
    unsigned long       s_magic;
    struct dentry       *s_root;
    struct rw_semaphore s_umount;
    int         s_count;
    atomic_t        s_active;
#ifdef CONFIG_SECURITY
    void                    *s_security;
#endif
    const struct xattr_handler **s_xattr;
#ifdef CONFIG_FS_ENCRYPTION
    const struct fscrypt_operations *s_cop;
    struct key      *s_master_keys; /* master crypto keys in use */
#endif
#ifdef CONFIG_FS_VERITY
    const struct fsverity_operations *s_vop;
#endif
#ifdef CONFIG_UNICODE
    struct unicode_map *s_encoding;
    __u16 s_encoding_flags;
#endif
    struct hlist_bl_head    s_roots;    /* alternate root dentries for NFS */
    struct list_head    s_mounts;   /* list of mounts; _not_ for fs use */
    struct block_device *s_bdev;
    struct backing_dev_info *s_bdi;
    struct mtd_info     *s_mtd;
    struct hlist_node   s_instances;
    unsigned int        s_quota_types;  /* Bitmask of supported quota types */
    struct quota_info   s_dquot;    /* Diskquota specific options */

    struct sb_writers   s_writers;

    /*
     * Keep s_fs_info, s_time_gran, s_fsnotify_mask, and
     * s_fsnotify_marks together for cache efficiency. They are frequently
     * accessed and rarely modified.
     */
    void            *s_fs_info; /* Filesystem private info */

    /* Granularity of c/m/atime in ns (cannot be worse than a second) */
    u32         s_time_gran;
    /* Time limits for c/m/atime in seconds */
    time64_t           s_time_min;
    time64_t           s_time_max;
#ifdef CONFIG_FSNOTIFY
    __u32           s_fsnotify_mask;
    struct fsnotify_mark_connector __rcu    *s_fsnotify_marks;
#endif

    char            s_id[32];   /* Informational name */
    uuid_t          s_uuid;     /* UUID */

    unsigned int        s_max_links;
    fmode_t         s_mode;

    /*
     * The next field is for VFS *only*. No filesystems have any business
     * even looking at it. You had been warned.
     */
    struct mutex s_vfs_rename_mutex;    /* Kludge */

    /*
     * Filesystem subtype.  If non-empty the filesystem type field
     * in /proc/mounts will be "type.subtype"
     */
    const char *s_subtype;

    const struct dentry_operations *s_d_op; /* default d_op for dentries */

    /*
     * Saved pool identifier for cleancache (-1 means none)
     */
    int cleancache_poolid;

    struct shrinker s_shrink;   /* per-sb shrinker handle */

    /* Number of inodes with nlink == 0 but still referenced */
    atomic_long_t s_remove_count;

    /* Pending fsnotify inode refs */
    atomic_long_t s_fsnotify_inode_refs;

    /* Being remounted read-only */
    int s_readonly_remount;

    /* per-sb errseq_t for reporting writeback errors via syncfs */
    errseq_t s_wb_err;

    /* AIO completions deferred from interrupt context */
    struct workqueue_struct *s_dio_done_wq;
    struct hlist_head s_pins;

    /*
     * Owning user namespace and default context in which to
     * interpret filesystem uids, gids, quotas, device nodes,
     * xattrs and security labels.
     */
    struct user_namespace *s_user_ns;

    /*
     * The list_lru structure is essentially just a pointer to a table
     * of per-node lru lists, each of which has its own spinlock.
     * There is no need to put them into separate cachelines.
     */
    struct list_lru     s_dentry_lru;
    struct list_lru     s_inode_lru;
    struct rcu_head     rcu;
    struct work_struct  destroy_work;

    struct mutex        s_sync_lock;    /* sync serialisation lock */

    /*
     * Indicates how deep in a filesystem stack this SB is
     */
    int s_stack_depth;

    /* s_inode_list_lock protects s_inodes */
    spinlock_t      s_inode_list_lock ____cacheline_aligned_in_smp;
    struct list_head    s_inodes;   /* all inodes */

    spinlock_t      s_inode_wblist_lock;
    struct list_head    s_inodes_wb;    /* writeback inodes */
} __randomize_layout;
```

所有的超级块对象都以双向循环链表的形式链接到一起, 链表中第一个元素使用 super_blocks 变量来表示

<div id="inode" />
### 索引节点对象

```c
/*
 * Keep mostly read-only and often accessed (especially for
 * the RCU path lookup and 'stat' data) fields at the beginning
 * of the 'struct inode'
 */
struct inode {
    umode_t         i_mode;
    unsigned short      i_opflags;
    kuid_t          i_uid;
    kgid_t          i_gid;
    unsigned int        i_flags;

#ifdef CONFIG_FS_POSIX_ACL
    struct posix_acl    *i_acl;
    struct posix_acl    *i_default_acl;
#endif

    const struct inode_operations   *i_op;
    struct super_block  *i_sb;
    struct address_space    *i_mapping;

#ifdef CONFIG_SECURITY
    void            *i_security;
#endif

    /* Stat data, not accessed from path walking */
    unsigned long       i_ino;
    /*
     * Filesystems may only read i_nlink directly.  They shall use the
     * following functions for modification:
     *
     *    (set|clear|inc|drop)_nlink
     *    inode_(inc|dec)_link_count
     */
    union {
        const unsigned int i_nlink;
        unsigned int __i_nlink;
    };
    dev_t           i_rdev;
    loff_t          i_size;
    struct timespec64   i_atime;
    struct timespec64   i_mtime;
    struct timespec64   i_ctime;
    spinlock_t      i_lock; /* i_blocks, i_bytes, maybe i_size */
    unsigned short          i_bytes;
    u8          i_blkbits;
    u8          i_write_hint;
    blkcnt_t        i_blocks;

#ifdef __NEED_I_SIZE_ORDERED
    seqcount_t      i_size_seqcount;
#endif

    /* Misc */
    unsigned long       i_state;
    struct rw_semaphore i_rwsem;

    unsigned long       dirtied_when;   /* jiffies of first dirtying */
    unsigned long       dirtied_time_when;

    struct hlist_node   i_hash;
    struct list_head    i_io_list;  /* backing dev IO list */
#ifdef CONFIG_CGROUP_WRITEBACK
    struct bdi_writeback    *i_wb;      /* the associated cgroup wb */

    /* foreign inode detection, see wbc_detach_inode() */
    int         i_wb_frn_winner;
    u16         i_wb_frn_avg_time;
    u16         i_wb_frn_history;
#endif
    struct list_head    i_lru;      /* inode LRU list */
    struct list_head    i_sb_list;
    struct list_head    i_wb_list;  /* backing dev writeback list */
    union {
        struct hlist_head   i_dentry;
        struct rcu_head     i_rcu;
    };
    atomic64_t      i_version;
    atomic64_t      i_sequence; /* see futex */
    atomic_t        i_count;
    atomic_t        i_dio_count;
    atomic_t        i_writecount;
#if defined(CONFIG_IMA) || defined(CONFIG_FILE_LOCKING)
    atomic_t        i_readcount; /* struct files open RO */
#endif
    union {
        const struct file_operations    *i_fop; /* former ->i_op->default_file_ops */
        void (*free_inode)(struct inode *);
    };
    struct file_lock_context    *i_flctx;
    struct address_space    i_data;
    struct list_head    i_devices;
    union {
        struct pipe_inode_info  *i_pipe;
        struct block_device *i_bdev;
        struct cdev     *i_cdev;
        char            *i_link;
       unsigned        i_dir_seq;
    };

    __u32           i_generation;

#ifdef CONFIG_FSNOTIFY
    __u32           i_fsnotify_mask; /* all events this inode cares about */
    struct fsnotify_mark_connector __rcu    *i_fsnotify_marks;
#endif

#ifdef CONFIG_FS_ENCRYPTION
    struct fscrypt_info *i_crypt_info;
#endif

#ifdef CONFIG_FS_VERITY
    struct fsverity_info    *i_verity_info;
#endif

    void            *i_private; /* fs or device private pointer */
} __randomize_layout;
```

文件系统处理文件所需要的所有信息都存放在索引节点对象


### 文件对象

```c
struct file {
    union {
        struct llist_node   fu_llist;
        struct rcu_head     fu_rcuhead;
    } f_u;
    struct path     f_path;
    struct inode        *f_inode;   /* cached value */
    const struct file_operations    *f_op;

    /*
     * Protects f_ep_links, f_flags.
     * Must not be taken from IRQ context.
     */
    spinlock_t      f_lock;
    enum rw_hint        f_write_hint;
    atomic_long_t       f_count;
    unsigned int        f_flags;
    fmode_t         f_mode;
    struct mutex        f_pos_lock;
    loff_t          f_pos;
    struct fown_struct  f_owner;
    const struct cred   *f_cred;
    struct file_ra_state    f_ra;

    u64         f_version;
#ifdef CONFIG_SECURITY
    void            *f_security;
#endif
    /* needed for tty driver, and maybe others */
    void            *private_data;

#ifdef CONFIG_EPOLL
    /* Used by fs/eventpoll.c to link all the hooks to this file */
    struct list_head    f_ep_links;
    struct list_head    f_tfile_llink;
#endif /* #ifdef CONFIG_EPOLL */
    struct address_space    *f_mapping;
    errseq_t        f_wb_err;
    errseq_t        f_sb_err; /* for syncfs */
} __randomize_layout
  __attribute__((aligned(4)));  /* lest something weird decides that 2 is OK
```

文件对象描述进程怎样与一个打开的文件进行交互，文件对象是在文件被打开时创建的, 存放文件对象中的主要信息是文件指针，即文件中当前的位置，下一个操作将在该位置发生

文件对象通常由一个名为 filp 的 slab 高速缓存分配，filp描述符地址存放在 filp_cachep 变量中

注意 struct file 中的 `struct file_opeations *f_op` 这个成员, 这个成员是不同文件对象对应的文件操作集合, 正如[字符设备驱动详解](../driver/cdev/cdev_details.md)中描述的, 在执行打开指定的文件时, 会执行指定文件对应的文件操作, 其使用方式类似如下:

```c
filp->f_op->xxxx()
```


### 目录项对象

```c
struct dentry {
    /* RCU lookup touched fields */
    unsigned int d_flags;       /* protected by d_lock */
    seqcount_spinlock_t d_seq;  /* per dentry seqlock */
    struct hlist_bl_node d_hash;    /* lookup hash list */
    struct dentry *d_parent;    /* parent directory */
    struct qstr d_name;
    struct inode *d_inode;      /* Where the name belongs to - NULL is
                     * negative */
    unsigned char d_iname[DNAME_INLINE_LEN];    /* small names */

    /* Ref lookup also touches following */
    struct lockref d_lockref;   /* per-dentry lock and refcount */
    const struct dentry_operations *d_op;
    struct super_block *d_sb;   /* The root of the dentry tree */
    unsigned long d_time;       /* used by d_revalidate */
    void *d_fsdata;         /* fs-specific data */

    union {
        struct list_head d_lru;     /* LRU list */
        wait_queue_head_t *d_wait;  /* in-lookup ones only */
    };
    struct list_head d_child;   /* child of parent list */
    struct list_head d_subdirs; /* our children */
    /*
     * d_alias and d_rcu can share memory
     */
    union {
        struct hlist_node d_alias;  /* inode alias list */
        struct hlist_bl_node d_in_lookup_hash;  /* only for in-lookup ones */
        struct rcu_head d_rcu;
    } d_u;
} __randomize_layout;
```

VFS 把每个目录看作由若干子目录和文件组成的一个普通文件

目录项对象在磁盘上并没有对应的映像，因此在 dentry 结构中不包含支撑该对象已被修改的字段


## 进程相关的文件


### 进程当前打开的文件

```c
/*
 * Open file table structure
 */
struct files_struct {
  /*  
   * read mostly part
   */
    atomic_t count;
    bool resize_in_progress;
    wait_queue_head_t resize_wait;

    struct fdtable __rcu *fdt;
    struct fdtable fdtab;
  /*  
   * written part on a separate cache line in SMP
   */
    spinlock_t file_lock ____cacheline_aligned_in_smp;
    unsigned int next_fd;
    unsigned long close_on_exec_init[1];
    unsigned long open_fds_init[1];
    unsigned long full_fds_bits_init[1];
    struct file __rcu * fd_array[NR_OPEN_DEFAULT];
};
```

struct files_struct 结构体用于表示进程当前打开的文件, 其存放在进程描述符 struct task_struct 的 files 字段中, 每当一个进程被执行时, 都会初始化该结构体, 我们通过 open 函数打开一个文件时, 返回的文件描述符将作为索引值, 找到对应的文件结构体
