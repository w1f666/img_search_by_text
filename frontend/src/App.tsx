import { ThemeProvider } from "next-themes"
import router from "./router"
import { RouterProvider } from "react-router-dom"
function App() {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
