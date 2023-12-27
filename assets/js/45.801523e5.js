(window.webpackJsonp=window.webpackJsonp||[]).push([[45],{433:function(t,_,r){"use strict";r.r(_);var a=r(2),i=Object(a.a)({},(function(){var t=this,_=t._self._c;return _("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[_("h1",{attrs:{id:"i2c-适配器"}},[_("a",{staticClass:"header-anchor",attrs:{href:"#i2c-适配器"}},[t._v("#")]),t._v(" I2C 适配器")]),t._v(" "),_("h2",{attrs:{id:"i2c-适配器驱动的注册和注销"}},[_("a",{staticClass:"header-anchor",attrs:{href:"#i2c-适配器驱动的注册和注销"}},[t._v("#")]),t._v(" I2C 适配器驱动的注册和注销")]),t._v(" "),_("p",[t._v("由于 I2C 总线控制器通常是在内存上, 所以它本身也连接在"),_("RouterLink",{attrs:{to:"/driver/platform/platform.html#platform_bus"}},[t._v("platform 总线")]),t._v("上, 要通过 platform_driver 和 platform_device 的匹配来执行")],1),t._v(" "),_("p",[t._v("通常在与 I2C 适配器所对应的 platform_driver 的 probe() 函数中完成两个工作：")]),t._v(" "),_("ol",[_("li",[_("p",[t._v("初始化 I2C 适配器所使用的硬件资源, 如申请 I/O 地址、中断号、时钟等")])]),t._v(" "),_("li",[_("p",[t._v("通过 i2c_add_adapter() 添加 i2c_adapter 的数据结构")])])]),t._v(" "),_("p",[t._v("通常在 platform_driver 的 remove() 函数完成与加载函数相反的工作:")]),t._v(" "),_("ol",[_("li",[_("p",[t._v("释放 I2C 适配器所使用的硬件资源")])]),t._v(" "),_("li",[_("p",[t._v("通过 i2c_del_adapter 删除 i2c_adapter 的数据结构")])])]),t._v(" "),_("h2",{attrs:{id:"i2c-总线的通信方式"}},[_("a",{staticClass:"header-anchor",attrs:{href:"#i2c-总线的通信方式"}},[t._v("#")]),t._v(" I2C 总线的通信方式")]),t._v(" "),_("p",[t._v("我们需要位特定的 I2C 适配器实现通信方法，主要实现 i2c_algorithm 的 functionality() 和 master_xfer() 函数")]),t._v(" "),_("p",[t._v("其中 functionality() 函数用于返回 algorithm 所支持的通信协议，如 I2C_FUNC_I2C、I2C_FUNC_10BIT_ADDR、I2C_FUNC_SMBUS_READ_TYPE、I2C_FUNC_SMBUS_WRITE_BYTE 等")]),t._v(" "),_("p",[t._v("master_xfer() 函数在 I2C 适配器上完成传递给它的 i2c_msg 数组中的每个 I2C 消息, 即完成发送消息给从设备的任务")])])}),[],!1,null,null,null);_.default=i.exports}}]);