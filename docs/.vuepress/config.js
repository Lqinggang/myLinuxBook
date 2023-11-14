module.exports = {
    base: '/myLinuxBlogs/',
    theme: 'reco',
    title: 'Linux 学习笔记',
    description: 'Linux 学习笔记',
    plugins: [
        [ 'vuepress-plugin-side-anchor' ]
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
                    [ '/driver/i2c.md', 'I2C 设备' ],
                    [ '/driver/spi.md', 'SPI 设备' ]
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
            }
        ]
    }
}
