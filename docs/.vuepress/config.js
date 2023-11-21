module.exports = {
    base: '/mylinuxbook/',
    theme: 'reco',
    title: 'Linux 学习笔记',
    description: 'Linux 学习笔记',
    plugins: [
        [
            'vuepress-plugin-right-anchor', {
                showDepth: 3,
                expand: {
                    trigger: 'click',
                    clickModeDefaultOpen: true
                }
            }
        ]
    ],
    themeConfig: {
        type: 'blog',
        repo: 'https://github.com/Lqinggang',
        repoLabel: 'GitHub',
        smoothScroll: true,
        displayAllHeaders: true,
        nav: [
            { text: 'Home', link: '/' }
        ],
        sidebar: [
            [ '/', '首页' ],
            {
                title: '设备驱动',
                children: [
                    [ '/driver/', 'Linux 设备驱动' ],
                    [ '/driver/kobject.md', 'kobject 对象' ],
                    [ '/driver/bus_type.md', 'Linux 总线对象' ],
                    [ '/driver/device.md', 'Linux 设备对象' ],
                    [ '/driver/driver.md', 'Linux 驱动程序对象' ],
                    [ '/driver/class.md', 'Linux 类对象' ],
                    [ '/driver/platform/platform.md', 'platform 设备' ],
                    [ '/driver/model.md', 'Linux 设备模型' ],
                    [ '/driver/cdev/cdev.md', '字符设备驱动' ],
                    [ '/driver/cdev/cdev_details.md', '字符设备驱动详解' ],
                    [ '/driver/i2c.md', 'I2C 设备驱动' ],
                    [ '/driver/spi.md', 'SPI 设备驱动' ]
                ]
            },
            {
                title: '虚拟文件系统',
                children: [
                    [ '/fs/', '虚拟文件系统' ],
                    [ '/fs/specialfs.md', '特殊文件系统' ]
                ]
            },
            {
                title: '网络通信',
                children: [ '/network/' ]
            },
            {
                title: '进程/线程间同步',
                children: [ '/sync/' ]
            },
            {
                title: '中断和异常',
                children: [ '/interrupt/' ]
            },
            [ '/reference.md', '参考文献' ]
        ]
    }
}
