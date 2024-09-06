a = quote foo end
c = `d
d = &a
a = double
var a, b
a = [a]
c = quote foo end
d = quote a = b in bar end
p = int -> double
p = {int, double} -> {}
p = {int, double} -> {T}
p = double -> {X, Y}
p = &{double} -> T
c = [quote end]
var b
var a: T -- This doesn't work yet
local terra a :: X -> Y
terra a.b :: {X, Y} -> {Z, W} 
terra g :: ptr
terra tab.g :: ptr
