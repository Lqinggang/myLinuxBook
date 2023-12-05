# 设备树(Device Tree)

## 简介

设备树(Device Tree), 描述设备树的文件叫做DTS(Device Tree Source), 用于描述板级设备信息, 可以理解为物理设备的一种描述, 总结?

设备树是一种描述硬件的数据结构, 由一系列被命名的节点(Node)和属性(Property)组成, 节点本身也可以包含字节点, 属性即成对出现的名称和值

以下将要介绍的关于设备树的全部内容将基于 ARM 设备

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

如下, 是Linux 6.6 中包含的树莓派4B 的 dts 文件, 本章节将以其作为示例讲解设备树节点

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

## 设备树部分函数

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
