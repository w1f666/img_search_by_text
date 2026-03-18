
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"; // 假设你也安装了 button 组件

export default function MyModal({children}: {children: React.ReactNode}) {
  return (
    <Dialog>
      {/* 触发器：点击这个按钮会自动打开弹窗 */}
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      {/* 弹窗内容：Tailwind 类名可以直接加在这里覆盖默认样式 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑个人档案</DialogTitle>
          <DialogDescription>
            在这里修改你的个人信息。修改完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        
        {/* 这里放你的表单或具体业务内容 */}
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 w-16 text-right">姓名</span>
            <input 
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" 
              defaultValue="John Doe" 
            />
          </div>
        </div>

        <DialogFooter>
          {/* 你可以使用 DialogClose 或者受控状态来关闭弹窗 */}
          <Button type="submit">保存更改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}