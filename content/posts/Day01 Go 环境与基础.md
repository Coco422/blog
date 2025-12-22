---
title: Day01 Go 环境与基础
description:
date: 2025-12-19T23:46:01+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2025-12-20T01:54:01+08:00
showLastMod: true
tags:
  - go
categories:
  - go-learn
---
# Day01 Go 环境与基础

首先准备环境。（之前为了搞些小工具，多多少少接触一点go，不过几乎可以说为0）
那么最重要的：官网，哪里的文档都不如亲妈的描述

> [!note] 
> [go.dev](https://go.dev/)
> [Documentation - The Go Programming Language](https://go.dev/doc/)
>[go.dev/learn](https://go.dev/learn/)

打开网站反正左右都是个download

![](https://imgbed.anluoying.com/2025/12/b73fbe81308d98d1ba1058bba2d8d679.png)

找个适合的下载吧（感觉这个都能单开一篇来写，这里没写是因为之前已经装过了）
完成之后terminal里可以看到版本号

![image.png](https://imgbed.anluoying.com/2025/12/fd3579fa0e5b0412169cfa99d71977ee.png)

> [!note] 
> 如果暂时不装环境。官方有一个 A Tour of Go，可以直接在这里学最基础的一些语法
> [A Tour of Go](https://go.dev/tour/welcome/1)
> 
![image.png](https://imgbed.anluoying.com/2025/12/35e48233ce4bcadd9b0506aa7ddb3778.png)

这里有个很有意思的事情，可以看到他的那句 打印居然是 `Hello，世界`，而不是咱们熟知的hello world，我还特意检查了一下是不是我的翻译插件又出bug了
那么grok小助手帮我搜一下吧（最近弄了个小号池）
![image.png](https://imgbed.anluoying.com/2025/12/5d744599f5c308eba2bbb12da5222a52.png)

主要是为了展示 Go对Unicode和UTF-8的完美支持

这里的指南总计需要半个小时左右即可阅读完毕，建议可以先读一遍。同时，我在读了一半的中文版后强烈建议有能力的一定要读英文版，当然，我读起来还是一卡一卡的啦（和今晚的网络质量一样😡）

## Packages

>Every Go program is made up of packages.
>
>Programs start running in package main.
>
>This program is using the packages with import paths "fmt" and "math/rand".
>
>By convention, the package name is the same as the last element of the import path. For instance, the "math/rand" package comprises files that begin with the statement package rand.

- **`package main`**: 告诉 Go 编译器，这个文件是一个**可执行程序**的入口，而不是一个库（Library）。
- **`func main()`**: 这是程序启动时**第一个执行**的函数。入口函数
- **`import "fmt"`**: 导入格式化包，这样你才能使用 `Println` 打印内容。

```go
package main

import (
	"fmt"
	"math/rand"
)

func main() {
	fmt.Println("My favorite number is", rand.Intn(10))
}

```
This code groups the imports into a parenthesized, "factored" import statement.

You can also write multiple import statements, like:
```
import "fmt"
import "math"
```

But it is good style to use the factored import statement.
## Exported names（可见性）

>In Go, a name is exported if it begins with a capital letter. For example, `Pizza` is an exported name, as is `Pi`, which is exported from the `math` package.
> 
> `pizza` and `pi` do not start with a capital letter, so they are not exported.
> 
> When importing a package, you can refer only to its exported names. Any "unexported" names are not accessible from outside the package.
> 
> Run the code. Notice the error message.
> 
> To fix the error, rename `math.pi` to `math.Pi` and try it again.

```go
package main

import (
	"fmt"
	"math"
)

func main() {
	fmt.Println(math.pi)
}

```


Go 语言中，没有像 Java 或 C++ 那样的 `public`、`private` 关键字。Go 直接通过首字母来区分

**首字母的大小写决定了该变量、函数或类型能否被“外人”看到。**

这里给到的示例代码运行会报错

`./prog.go:9:19: undefined: math.pi (but have Pi)`

> [!tip] 
> - **大写字母开头 (Exported)**：它是“导出的”，意思是**可以被外部包访问**（相当于 `public`）。
> - **小写字母开头 (Unexported)**：它是“未导出的”，意思是**只能在自己包内部使用**（相当于 `private`）。 

改成`Pi`之后输出就是

`3.141592653589793`

这个设计是go的极简思想（说实话，感觉很有python的宗旨，比python还python）

## 函数

> A function can take zero or more arguments.
> 
> In this example, `add` takes two parameters of type `int`.
> 
> Notice that the type comes _after_ the variable name.
> 
> (For more about why types look the way they do, see the [article on Go's declaration syntax](https://go.dev/blog/gos-declaration-syntax).)

```go
package main

import "fmt"

func add(x int, y int) int {
	return x + y
}

func main() {
	fmt.Println(add(42, 13))
}

```

说实话这个看起来很费劲，当然，对于等下的变量来说，更费劲的还没来
### Functions continued

>When two or more consecutive named function parameters share a type, you can omit the type from all but the last.

`x, y int`

ok熟悉，这不是 C/C++ 的 `int x, y;`
可是，这里是函数里啊，真的相当极简了
好在我适应性强呢 `[/狗头]`
  
### Multiple results

>A function can return any number of results.
>
>The `swap` function returns two strings.

```go
package main

import "fmt"

func swap(x, y string) (string, string) {
	return y, x
}

func main() {
	a, b := swap("hello", "world")
	fmt.Println(a, b)
}

```

### Named return values

> Go's return values may be named. If so, they are treated as variables defined at the top of the function.
> 
> These names should be used to document the meaning of the return values.
> 
> A `return` statement without arguments returns the named return values. This is known as a "naked" return.
> 
> Naked return statements should be used only in short functions, as with the example shown here. They can harm readability in longer functions.

```go
package main

import "fmt"

func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return
}

func main() {
	fmt.Println(split(17))
}

```

WTF，说实话，震惊来着的。有啥用，只能说，短函数真的能偷懒就偷懒了。这里既在函数开始的时候就定义了x y 变量。还在return的时候啥都没带，这就是Naked return~，他会返回x和y。当然，官方也说了，长函数别这样玩

## 变量声明和初始化

>The `var` statement declares a list of variables; as in function argument lists, the type is last.
>
>A `var` statement can be at package or function level. We see both in this example.

`var c, python, java bool`

### Variables with initializers

> A var declaration can include initializers, one per variable.
> 
> If an initializer is present, the type can be omitted; the variable will take the type of the initializer.

```go
package main

import "fmt"

var i, j int = 1, 2

func main() {
	var c, python, java = true, false, "no!"
	fmt.Println(i, j, c, python, java)
}

```

output

`1 2 true false no!`
### Short variable declarations

> Inside a function, the `:=` short assignment statement can be used in place of a `var` declaration with implicit type.
> 
> Outside a function, every statement begins with a keyword (`var`, `func`, and so on) and so the `:=` construct is not available.

```
package main

import "fmt"

func main() {
	var i, j int = 1, 2
	k := 3
	c, python, java := true, false, "no!"

	fmt.Println(i, j, k, c, python, java)
}

```

可以，这个喜欢

## 基本类型

> Go's basic types are
> 
> bool
> 
> string
> 
> int  int8  int16  int32  int64
> uint uint8 uint16 uint32 uint64 uintptr
> 
> byte // alias for uint8
> 
> rune // alias for int32
>      // represents a Unicode code point
> 
> float32 float64
> 
> complex64 complex128
> 
> The example shows variables of several types, and also that variable declarations may be "factored" into blocks, as with import statements.
> 
> The `int`, `uint`, and `uintptr` types are usually 32 bits wide on 32-bit systems and 64 bits wide on 64-bit systems. When you need an integer value you should use `int` unless you have a specific reason to use a sized or unsigned integer type.



后面的数字代表**占多少位(bit)**，默认int长度取决于系统

- uintptr 这是一个特殊类型，大到足以存储指针的位模式，底层开发时用。
- uint 只能表示 0 和正数。常用于处理二进制数据、内存地址等。这个类型写C单片机常构造

- **默认用 `int`**：除非有非常明确的理由（比如：这个数一定很大，超过了 20 亿，需要用 `int64`；或者你在处理二进制字节流，需要用 `byte`），否则一律声明为 `int`。
- **没有隐式转换**：
    - 在 Python 中，可以用 `1 + 1.5`。
    - 在 Go 中，**`int` 和 `int32` 是两种完全不同的类型**。不能直接把它们相加，必须手动转换：`int64(myInt32) + myInt64`。
- **零值 (Zero Value)**：在 Go 中，声明一个变量但不给它赋值，它不会是 `undefined` 或 `None`。
    - 数字类型默认是 `0`。
    - 布尔类型默认是 `false`。
    - 字符串类型默认是 `""` (空字符串)。


```go
package main

import (
	"fmt"
	"math/cmplx"
)
// factored into blocks 就是这种写法，不需要在每一行都写 `var`，代码显得整洁。
var (
	ToBe   bool       = false
	MaxInt uint64     = 1<<64 - 1
	z      complex128 = cmplx.Sqrt(-5 + 12i)
)

func main() {
	fmt.Printf("Type: %T Value: %v\n", ToBe, ToBe)
	fmt.Printf("Type: %T Value: %v\n", MaxInt, MaxInt)
	fmt.Printf("Type: %T Value: %v\n", z, z)
}

```

```
Type: bool Value: false
Type: uint64 Value: 18446744073709551615
Type: complex128 Value: (2+3i)
```

这里我有个疑问，没有None之类的吗？
那么go里面 用的是 `nil` ，啊哈，我在Lua那里认识你

由于int、bool、string等都有初始值，也就是 0 和false 以及 ""，nil不能赋值给他们

下一页就讲了这个咯
### _zero value_

### Type conversions

> The expression `T(v)` converts the value `v` to the type `T`.
> 
> Some numeric conversions:
> 
> var i int = 42
> var f float64 = float64(i)
> var u uint = uint(f)
> 
> Or, put more simply:
> 
> i := 42
> f := float64(i)
> u := uint(f)
> 
> Unlike in C, in Go assignment between items of different type requires an explicit conversion. Try removing the `float64` or `uint` conversions in the example and see what happens.

T(v) 把变量 v 转换为类型 T 

```go
package main

import (
	"fmt"
	"math"
)

func main() {
	var x, y int = 3, 4
	var f float64 = math.Sqrt(float64(x*x + y*y))
	var z uint = uint(f)
	fmt.Println(x, y, z)
}

```
output `3 4 5`

**浮点数转整数**：  
当使用 `int(f)` 转换浮点数时，Go 会直接**截断**小数部分（也就是向 0 取整），而不是四舍五入。
- `int(3.9)` 结果是 `3`
- `int(-3.9)` 结果是 `-3`

### Type inference

> When declaring a variable without specifying an explicit type (either by using the `:=` syntax or `var =` expression syntax), the variable's type is inferred from the value on the right hand side.
> 
> When the right hand side of the declaration is typed, the new variable is of that same type:
> 
> var i int
> j := i // j is an int
> 
> But when the right hand side contains an untyped numeric constant, the new variable may be an `int`, `float64`, or `complex128` depending on the precision of the constant:
> 
> i := 42           // int
> f := 3.142        // float64
> g := 0.867 + 0.5i // complex128


我试了一下 字符串可以，gemini提醒我，单引号包裹字符是 int32，也就是rune类型

> 数字常量在 Go 里面有 **“默认类型”** 的概念，这很容易让初学者困惑：
> 
> - **整数**：如果你写 `i := 42`，即使 `42` 还没超过 `int8` 的范围，Go 也会统一推断为 **`int`**（在 64 位系统上就是 `int64`）。它不会自作聪明帮你选个小的类型。
> - **浮点数**：如果你写 `f := 3.14`，Go 永远会推断为 **`float64`**，而不是 `float32`。因为在现代计算机中，`float64` 是精度和性能最平衡的选择。

```go
// 推断为切片 []int
nums := []int{1, 2, 3} 

// 推断为函数类型
add := func(a, b int) int { return a + b } 

// 从函数返回值推断
result := math.Sqrt(100) // 因为 Sqrt 返回 float64，所以 result 也是 float64
```

Go 的类型推断遵循 **“所见即所得”**：
1. **右边是什么类型，左边就是什么类型。**
2. **如果是没有明确类型的数字常量，则按“大类”走**（整数给 `int`，小数给 `float64`）。
## 常量

> Constants are declared like variables, but with the `const` keyword.
> 
> Constants can be character, string, boolean, or numeric values.
> 
> Constants cannot be declared using the `:=` syntax.

### Numeric Constants

> Numeric constants are high-precision _values_.
> An untyped constant takes the type needed by its context.
> Try printing `needInt(Big)` too.
> (An `int` can store at maximum a 64-bit integer, and sometimes less.)

```go
package main

import "fmt"

const (
	// Create a huge number by shifting a 1 bit left 100 places.
	// In other words, the binary number that is 1 followed by 100 zeroes.
	Big = 1 << 100
	// Shift it right again 99 places, so we end up with 1<<1, or 2.
	Small = Big >> 99
)

func needInt(x int) int { return x*10 + 1 }
func needFloat(x float64) float64 {
	return x * 0.1
}

func main() {
	// 加这个会报错./prog.go:20:22: cannot use Big (untyped int constant 1267650600228229401496703205376) as int value in argument to needInt (overflows)
	fmt.Println(needInt(Big))
	fmt.Println(needInt(Small))
	fmt.Println(needFloat(Small))
	fmt.Println(needFloat(Big))
}

```

常量是“理想数字”，编译时判断一次，如果变量参与那就可能编译判断可能运行判断

## 结束

至此第一天结束，但是我没有按照G老师的课程，内心愧疚。明天继续
