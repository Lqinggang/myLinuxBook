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
                    [ '/driver/modules/modules.md', 'Linux 设备驱动相关组件' ],
                    [ '/driver/platform/platform.md', 'platform 设备' ],
                    [ '/driver/platform/match.md', 'platform 设备的匹配' ],
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
                    [ '/fs/commonfs.md', '通用文件模型' ],
                    [ '/fs/specialfs.md', '特殊文件系统' ]
                ]
            },
            {
                title: '网络通信',
                children: [
                    [ '/network/', '网络通信' ]
                ]
            },
            {
                title: '进程/线程',
                children: [
                    [ '/task/', '进程/线程'  ]
                ]
            },
            {
                title: '同步',
                children: [
                    [ '/sync/', '同步' ]
                ]
            },
            {
                title: '中断和异常',
                children: [
                    [ '/interrupt/', '中断和异常' ],
                    [ '/interrupt/syscall.md', '系统调用' ]
                ]
            },
            {
                title: '定时器',
                children: [
                    [ '/timer/', '定时器' ]
                ]
            },
            {
                title: '示例',
                children: [
                    [ '/example/open.md', 'open 函数'  ]
                ]
            },
            [ '/reference.md', '参考文献' ]
        ]
    }
}
