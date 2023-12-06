# 设备树(Device Tree)

## 简介

设备树(Device Tree), 描述设备树的文件叫做DTS(Device Tree Source), 用于描述板级设备信息, 可以理解为物理设备的一种描述, 总结?

设备树是一种描述硬件的数据结构, 由一系列被命名的节点(Node)和属性(Property)组成, 节点本身也可以包含字节点, 属性即成对出现的名称和值

以下将要介绍的关于设备树的全部内容将基于 ARM 设备, ARM Linux 是在 3.x 中引入设备树的

### DTS(Device Tree Source)

.dts 文件是一种 ASCII 文本格式的设备树描述文件，.dtsi 文件包含 SoC 公用的部分或多个设备共同的部分, 类似与 c 语言中的头文件, 在 .dts 文件中可以通过 include 的方式包含进来:

```dts
#include "xxxxx.dtsi"
```

### DTC(Device Tree Compiler)

DTC 是将 .dts 文件编译为 .dtb 的工具

### DTB(Device Tree Blob)

.dtb 是 .dts 被 DTC 编译之后生成的二进制格式的设备描述文件, 可由内核解析。

## 设备树节点

如下, 是Linux 6.6 中包含的树莓派4B 的 dts 文件(bcm2711-rpi-4-b.dts), 本章节将以其作为示例讲解设备树节点

```dts
// SPDX-License-Identifier: GPL-2.0
/dts-v1/;
#include "bcm2711.dtsi"
#include "bcm2711-rpi.dtsi"
#include "bcm283x-rpi-led-deprecated.dtsi"
#include "bcm283x-rpi-usb-peripheral.dtsi"
#include "bcm283x-rpi-wifi-bt.dtsi"

/ {
	compatible = "raspberrypi,4-model-b", "brcm,bcm2711";
	model = "Raspberry Pi 4 Model B";

	chosen {
		/* 8250 auxiliary UART instead of pl011 */
		stdout-path = "serial1:115200n8";
	};

	sd_io_1v8_reg: regulator-sd-io-1v8 {
		compatible = "regulator-gpio";
		regulator-name = "vdd-sd-io";
		regulator-min-microvolt = <1800000>;
		regulator-max-microvolt = <3300000>;
		regulator-boot-on;
		regulator-always-on;
		regulator-settling-time-us = <5000>;
		gpios = <&expgpio 4 GPIO_ACTIVE_HIGH>;
		states = <1800000 0x1>,
			 <3300000 0x0>;
		status = "okay";
	};

	sd_vcc_reg: regulator-sd-vcc {
		compatible = "regulator-fixed";
		regulator-name = "vcc-sd";
		regulator-min-microvolt = <3300000>;
		regulator-max-microvolt = <3300000>;
		regulator-boot-on;
		enable-active-high;
		gpio = <&expgpio 6 GPIO_ACTIVE_HIGH>;
	};
};

&bt {
	shutdown-gpios = <&expgpio 0 GPIO_ACTIVE_HIGH>;
};

&ddc0 {
	status = "okay";
};

&ddc1 {
	status = "okay";
};

&expgpio {
	gpio-line-names = "BT_ON",		/*  0 */
			  "WL_ON",
			  "PWR_LED_OFF",
			  "GLOBAL_RESET",
			  "VDD_SD_IO_SEL",
			  "CAM_GPIO",		/*  5 */
			  "SD_PWR_ON",
			  "";
};

&gpio {
	/*
	 * Parts taken from rpi_SCH_4b_4p0_reduced.pdf and
	 * the official GPU firmware DT blob.
	 *
	 * Legend:
	 * "FOO" = GPIO line named "FOO" on the schematic
	 * "FOO_N" = GPIO line named "FOO" on schematic, active low
	 */
	gpio-line-names = "ID_SDA",		/*  0 */
			  "ID_SCL",
			  "SDA1",
			  "SCL1",
			  "GPIO_GCLK",
			  "GPIO5",		/*  5 */
			  "GPIO6",
			  "SPI_CE1_N",
			  "SPI_CE0_N",
			  "SPI_MISO",
			  "SPI_MOSI",		/* 10 */
			  "SPI_SCLK",
			  "GPIO12",
			  "GPIO13",
			  /* Serial port */
			  "TXD1",
			  "RXD1",		/* 15 */
			  "GPIO16",
			  "GPIO17",
			  "GPIO18",
			  "GPIO19",
			  "GPIO20",		/* 20 */
			  "GPIO21",
			  "GPIO22",
			  "GPIO23",
			  "GPIO24",
			  "GPIO25",		/* 25 */
			  "GPIO26",
			  "GPIO27",
			  "RGMII_MDIO",
			  "RGMIO_MDC",
			  /* Used by BT module */
			  "CTS0",		/* 30 */
			  "RTS0",
			  "TXD0",
			  "RXD0",
			  /* Used by Wifi */
			  "SD1_CLK",
			  "SD1_CMD",		/* 35 */
			  "SD1_DATA0",
			  "SD1_DATA1",
			  "SD1_DATA2",
			  "SD1_DATA3",
			  /* Shared with SPI flash */
			  "PWM0_MISO",		/* 40 */
			  "PWM1_MOSI",
			  "STATUS_LED_G_CLK",
			  "SPIFLASH_CE_N",
			  "SDA0",
			  "SCL0",		/* 45 */
			  "RGMII_RXCLK",
			  "RGMII_RXCTL",
			  "RGMII_RXD0",
			  "RGMII_RXD1",
			  "RGMII_RXD2",		/* 50 */
			  "RGMII_RXD3",
			  "RGMII_TXCLK",
			  "RGMII_TXCTL",
			  "RGMII_TXD0",
			  "RGMII_TXD1",		/* 55 */
			  "RGMII_TXD2",
			  "RGMII_TXD3";
};

&hdmi0 {
	status = "okay";
};

&hdmi1 {
	status = "okay";
};

&led_act {
	gpios = <&gpio 42 GPIO_ACTIVE_HIGH>;
};

&leds {
	led_pwr: led-pwr {
		label = "PWR";
		gpios = <&expgpio 2 GPIO_ACTIVE_LOW>;
		default-state = "keep";
		linux,default-trigger = "default-on";
	};
};

&pixelvalve0 {
	status = "okay";
};

&pixelvalve1 {
	status = "okay";
};

&pixelvalve2 {
	status = "okay";
};

&pixelvalve4 {
	status = "okay";
};

&pwm1 {
	pinctrl-names = "default";
	pinctrl-0 = <&pwm1_0_gpio40 &pwm1_1_gpio41>;
	status = "okay";
};

/* EMMC2 is used to drive the SD card */
&emmc2 {
	vqmmc-supply = <&sd_io_1v8_reg>;
	vmmc-supply = <&sd_vcc_reg>;
	broken-cd;
	status = "okay";
};

&genet {
	phy-handle = <&phy1>;
	phy-mode = "rgmii-rxid";
	status = "okay";
};

&genet_mdio {
	phy1: ethernet-phy@1 {
		/* No PHY interrupt */
		reg = <0x1>;
	};
};

&pcie0 {
	pci@0,0 {
		device_type = "pci";
		#address-cells = <3>;
		#size-cells = <2>;
		ranges;

		reg = <0 0 0 0 0>;

		usb@0,0 {
			reg = <0 0 0 0 0>;
			resets = <&reset RASPBERRYPI_FIRMWARE_RESET_ID_USB>;
		};
	};
};

/* uart0 communicates with the BT module */
&uart0 {
	pinctrl-names = "default";
	pinctrl-0 = <&uart0_ctsrts_gpio30 &uart0_gpio32>;
	uart-has-rtscts;
};

/* uart1 is mapped to the pin header */
&uart1 {
	pinctrl-names = "default";
	pinctrl-0 = <&uart1_gpio14>;
	status = "okay";
};

&vc4 {
	status = "okay";
};

&vec {
	status = "disabled";
};

&wifi_pwrseq {
	reset-gpios = <&expgpio 1 GPIO_ACTIVE_LOW>;
};
```

### /

```dts
/ {
};
```

根节点, 在所有的设备树中都包含由一个根节点, 用于表示设备树描述的起始点

### compatible

<div id="compatible" />

dts 中使用 `compatible` 来表示兼容属性, 设备驱动会根据 `struct device_driver` 数据结构中的 `of_match_table` 成员对应的兼容性匹配表匹配设备

#### 根节点兼容性

```dts
	compatible = "raspberrypi,4-model-b", "brcm,bcm2711";
```

如上, 是在 '/' 根节点下, 对应的就是 '/' 的兼容属性， 根节点 '/' 的兼容属性可判断启动的是什么设备, 一般而言, 第一个属性值是板子级别的属性, 后一个属性值是芯片级别(或者芯片系列级别)的属性, 兼容属性值按先后属性表示范围依次扩大

这里, 第一个属性值表示的是这份 dts 文件作用于树莓派 4B 这块板子, 后一个属性值表示这份 dts 文件也兼容 bcm2711 芯片，作为对比，以下是树莓派400的 dts 文件, 和树莓派4B比较, 可以发现, 只有第一个属性值一样(这两个用的都是 bcm2711 的芯片)

```dts
    compatible = "raspberrypi,400", "brcm,bcm2711";
```

`compatible` 兼容属性也可以包含两个以上的情况, 如下 broadcom/bcm953012hr.dts 文件中定义的：

```dts
    compatible = "brcm,bcm953012hr", "brcm,bcm53012", "brcm,bcm4708";
```

此时, 第一个属性值依然表示板子级别的属性, 第二个属性值是特定芯片级别属性, 第三个属性是芯片系列级别属性

在 Linux 内核中, 通过 [of_machine_is_compatible](#of_machine_is_compatible) 来判断根节点兼容性

#### 设备节点兼容性

除了根节点兼容性之外, 在 .dts 文件中的每个设备节点都可以有一个兼容属性:

```dts
	sd_io_1v8_reg: regulator-sd-io-1v8 {
		compatible = "regulator-gpio";
    };
```

如上, 在树莓派4B 中, regulator-sd-io-1v8 设备节点就有一个设备节点兼容性, 与根节点兼容性类似, 兼容属性列表越往后代表的兼容范围越大

一般而言，设备节点兼容性是第一个兼容性值表示节点代表的确切设备, 形式为 `<manufacturer>,<model>`， 其后的兼容性值表示可以兼容的其他设备

```dts
        uart2: serial@7e201400 {
            compatible = "arm,pl011", "arm,primecell";
        };
```

如上, 是 bcm2711.dtsi 中 uart2 对应的节点兼容性, 第一个属性值为 "arm,pl011", 表示，这个节点可以兼容 manufacturer 为 arm, model 为 pl011 的设备, 后续兼容性依次类推


在 Linux 内核中, 通过 [of_device_is_compatible](#of_device_compatible_match) 来判断设备节点兼容性

### cpus

cpus 用于描述此设备上的 cpu

```dts
    cpus: cpus {
        #address-cells = <1>;
        #size-cells = <0>;
        enable-method = "brcm,bcm2836-smp"; // for ARM 32-bit

        /* Source for d/i-cache-line-size and d/i-cache-sets
         * https://developer.arm.com/documentation/100095/0003
         * /Level-1-Memory-System/About-the-L1-memory-system?lang=en
         * Source for d/i-cache-size
         * https://www.raspberrypi.com/documentation/computers
         * /processors.html#bcm2711
         */
        cpu0: cpu@0 {
            device_type = "cpu";
            compatible = "arm,cortex-a72";
            reg = <0>;
            enable-method = "spin-table";
            cpu-release-addr = <0x0 0x000000d8>;
            d-cache-size = <0x8000>;
            d-cache-line-size = <64>;
            d-cache-sets = <256>; // 32KiB(size)/64(line-size)=512ways/2-way set
            i-cache-size = <0xc000>;
            i-cache-line-size = <64>;
            i-cache-sets = <256>; // 48KiB(size)/64(line-size)=768ways/3-way set
            next-level-cache = <&l2>;
        };
    };
```
如上, 是在 bcm2711.dtsi 文件中, 截取的 cpus 设备节点部分内容, 这里不难看出 cpu 也有自己的[兼容性属性](#compatible), 在 bcm2711.dtsi 中, 一共描述出来了 4 个 cpu (bcm2711芯片是4个 cortex-a72 核)

注意，这里的`cpus: cpus`和`cpu0: cpu0@0`表示形式, 它们遵循的组织形式为 `[label: ]<name>[@<unit-address>]`, 其中 label 和 unit-address 都是可选的, name 表示节点对应的设备类型, 多个相同类型设备节点的 name 值可以一样, 只要保证 unit-address 不同即可, 如bcm2711.dtsi 文件中,

```dts
    cpus: cpus {
        cpu0: cpu@0 {
        };
        cpu1: cpu@1 {
        };
        cpu2: cpu@2 {
        };
        cpu3: cpu@3 {
        };
    };
```

它们对应的 name 都是相同, 但是 unit-address 不同

对于挂载在内存空间的设备而言, @字符后跟的一般就是该设备在内存空间的基地址, 如

```dts
        pcie0: pcie@7d500000 {
            compatible = "brcm,bcm2711-pcie";
            reg = <0x0 0x7d500000 0x9310>;
        };
```

对于挂载在总线上的外设而言, @字符后跟的一般是从设备的地址, 如

```dts
        i2c3: i2c@7e205600 {
            compatible = "brcm,bcm2711-i2c", "brcm,bcm2835-i2c";
            reg = <0x7e205600 0x200>;
        };
```

## 设备树部分函数

### of_machine_is_compatible

<div id="of_machine_is_compatible" />

```c
/**
 * of_machine_is_compatible - Test root of device tree for a given compatible value
 * @compat: compatible string to look for in root node's compatible property.
 *
 * Return: A positive integer if the root node has the given value in its
 * compatible property.
 */
int of_machine_is_compatible(const char *compat)
{
    struct device_node *root;
    int rc = 0;

    root = of_find_node_by_path("/");
    if (root) {
        rc = of_device_is_compatible(root, compat);
        of_node_put(root);
    }
    return rc;
}
EXPORT_SYMBOL(of_machine_is_compatible);
```

该函数用于判断目前运行的板子或 SoC 的兼容性, 即匹配设备树根节点下的兼容属性 compatible 对应的属性值是否匹配 compat 指定的字符串(即字符串值是否相等)


### of_device_compatible_match

<div id="of_device_compatible_match" />

```c
/** Checks if the device is compatible with any of the entries in
 *  a NULL terminated array of strings. Returns the best match
 *  score or 0.
 */
int of_device_compatible_match(const struct device_node *device,
                   const char *const *compat)
{
    unsigned int tmp, score = 0;

    if (!compat)
        return 0;

    while (*compat) {
        tmp = of_device_is_compatible(device, *compat);
        if (tmp > score)
            score = tmp;
        compat++;
    }

    return score;
}
EXPORT_SYMBOL_GPL(of_device_compatible_match);
```

该函数用于判断设备节点的兼容性, 即匹配设备节点下的兼容属性 compatible 对应的属性值是否匹配 compat 指定的字符串(即字符串值是否相等)

### of_find_property

```c
#define of_prop_cmp(s1, s2)     strcasecmp((s1), (s2))

static struct property *__of_find_property(const struct device_node *np,
                       const char *name, int *lenp)
{
    struct property *pp;

    if (!np)
        return NULL;

    for (pp = np->properties; pp; pp = pp->next) {
        if (of_prop_cmp(pp->name, name) == 0) {
            if (lenp)
                *lenp = pp->length;
            break;
        }
    }

    return pp;
}

struct property *of_find_property(const struct device_node *np,
                  const char *name,
                  int *lenp)
{
    struct property *pp;
    unsigned long flags;

    raw_spin_lock_irqsave(&devtree_lock, flags);
    pp = __of_find_property(np, name, lenp);
    raw_spin_unlock_irqrestore(&devtree_lock, flags);

    return pp;
}
EXPORT_SYMBOL(of_find_property);
```

### of_prop_next_string
```c
const char *of_prop_next_string(struct property *prop, const char *cur)
{
    const void *curv = cur;

    if (!prop)
        return NULL;

    if (!cur)
        return prop->value;

    curv += strlen(cur) + 1;
    if (curv >= prop->value + prop->length)
        return NULL;

    return curv;
}
EXPORT_SYMBOL_GPL(of_prop_next_string);
```

### of_find_node_by_type

```c
static bool __of_node_is_type(const struct device_node *np, const char *type)
{
    const char *match = __of_get_property(np, "device_type", NULL);

    return np && match && type && !strcmp(match, type);
}

/**
 * of_find_node_by_type - Find a node by its "device_type" property
 * @from:   The node to start searching from, or NULL to start searching
 *      the entire device tree. The node you pass will not be
 *      searched, only the next one will; typically, you pass
 *      what the previous call returned. of_node_put() will be
 *      called on from for you.
 * @type:   The type string to match against
 *
 * Return: A node pointer with refcount incremented, use
 * of_node_put() on it when done.
 */
struct device_node *of_find_node_by_type(struct device_node *from,
    const char *type)
{
    struct device_node *np;
    unsigned long flags;

    raw_spin_lock_irqsave(&devtree_lock, flags);
    for_each_of_allnodes_from(from, np)
        if (__of_node_is_type(np, type) && of_node_get(np))
            break;
    of_node_put(from);
    raw_spin_unlock_irqrestore(&devtree_lock, flags);
    return np;
}
EXPORT_SYMBOL(of_find_node_by_type);
```


### of_node_name_eq

```c
bool of_node_name_eq(const struct device_node *np, const char *name)
{
    const char *node_name;
    size_t len;

    if (!np)
        return false;

    node_name = kbasename(np->full_name);
    len = strchrnul(node_name, '@') - node_name;

    return (strlen(name) == len) && (strncmp(node_name, name, len) == 0);
}
EXPORT_SYMBOL(of_node_name_eq);

```

## 基于设备树的设备和驱动的匹配

### of_driver_match_device

```c
/**
 * of_match_device - Tell if a struct device matches an of_device_id list
 * @matches: array of of device match structures to search in
 * @dev: the of device structure to match against
 *
 * Used by a driver to check whether an platform_device present in the
 * system is in its list of supported devices.
 */
const struct of_device_id *of_match_device(const struct of_device_id *matches,
                       const struct device *dev)
{
    if (!matches || !dev->of_node || dev->of_node_reused)
        return NULL;
    return of_match_node(matches, dev->of_node);
}
EXPORT_SYMBOL(of_match_device);

/**
 * of_driver_match_device - Tell if a driver's of_match_table matches a device.
 * @drv: the device_driver structure to test
 * @dev: the device structure to match against
 */
static inline int of_driver_match_device(struct device *dev,
                     const struct device_driver *drv)
{
    return of_match_device(drv->of_match_table, dev) != NULL;
}
```

正如[platform设备的匹配](./platform/match.md)中描述的那样, 基于设备树的设备和驱动的匹配通过 of_driver_match_device 进行, 而 of_driver_match_device 函数通过调用 of_match_device 进行匹配, 它们的实现如上


### of_match_node

```c
/**
 * of_match_node - Tell if a device_node has a matching of_match structure
 * @matches:    array of of device match structures to search in
 * @node:   the of device structure to match against
 *
 * Low level utility function used by device matching.
 */
const struct of_device_id *of_match_node(const struct of_device_id *matches,
                     const struct device_node *node)
{
    const struct of_device_id *match;
    unsigned long flags;

    raw_spin_lock_irqsave(&devtree_lock, flags);
    match = __of_match_node(matches, node);
    raw_spin_unlock_irqrestore(&devtree_lock, flags);
    return match;
}
EXPORT_SYMBOL(of_match_node);
```


### \__of_match_node

```c
static
const struct of_device_id *__of_match_node(const struct of_device_id *matches,
                       const struct device_node *node)
{
    const struct of_device_id *best_match = NULL;
    int score, best_score = 0;

    if (!matches)
        return NULL;

    for (; matches->name[0] || matches->type[0] || matches->compatible[0]; matches++) {
        score = __of_device_is_compatible(node, matches->compatible,
                          matches->type, matches->name);
        if (score > best_score) {
            best_match = matches;
            best_score = score;
        }
    }

    return best_match;
}
```

### \__of_device_is_compatible

```c
#define of_compat_cmp(s1, s2, l)    strncmp((s1), (s2), (l))


/**
 * __of_device_is_compatible() - Check if the node matches given constraints
 * @device: pointer to node
 * @compat: required compatible string, NULL or "" for any match
 * @type: required device_type value, NULL or "" for any match
 * @name: required node name, NULL or "" for any match
 *
 * Checks if the given @compat, @type and @name strings match the
 * properties of the given @device. A constraints can be skipped by
 * passing NULL or an empty string as the constraint.
 *
 * Returns 0 for no match, and a positive integer on match. The return
 * value is a relative score with larger values indicating better
 * matches. The score is weighted for the most specific compatible value
 * to get the highest score. Matching type is next, followed by matching
 * name. Practically speaking, this results in the following priority
 * order for matches:
 *
 * 1. specific compatible && type && name
 * 2. specific compatible && type
 * 3. specific compatible && name
 * 4. specific compatible
 * 5. general compatible && type && name
 * 6. general compatible && type
 * 7. general compatible && name
 * 8. general compatible
 * 9. type && name
 * 10. type
 * 11. name
 */
static int __of_device_is_compatible(const struct device_node *device,
                     const char *compat, const char *type, const char *name)
{
    struct property *prop;
    const char *cp;
    int index = 0, score = 0;

    /* Compatible match has highest priority */
    if (compat && compat[0]) {
        prop = __of_find_property(device, "compatible", NULL);
        for (cp = of_prop_next_string(prop, NULL); cp;
             cp = of_prop_next_string(prop, cp), index++) {
            if (of_compat_cmp(cp, compat, strlen(compat)) == 0) {
                score = INT_MAX/2 - (index << 2);
                break;
            }
        }
        if (!score)
            return 0;
    }

    /* Matching type is better than matching name */
    if (type && type[0]) {
        if (!__of_node_is_type(device, type))
            return 0;
        score += 2;
    }

    /* Matching name is a bit better than not */
    if (name && name[0]) {
        if (!of_node_name_eq(device, name))
            return 0;
        score++;
    }

    return score;
}
```
