import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import "../../NeonCursor.css"

const NeonCursor = () => {

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isClicking, setIsClicking] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const rafRef = useRef(null)
  const pendingPos = useRef({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    pendingPos.current = { x: e.clientX, y: e.clientY }
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      setPosition(pendingPos.current)
      rafRef.current = null
    })
  }, [])

  const handleMouseDown = () => setIsClicking(true)
  const handleMouseUp = () => setIsClicking(false)

  const handleMouseOver = useCallback((e) => {
    const target = e.target
    if (target.closest("a, button, input, textarea, [data-hover='true']")) {
      setIsHovering(true)
    }
  }, [])

  const handleMouseOut = useCallback(() => {
    setIsHovering(false)
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("mouseover", handleMouseOver)
    window.addEventListener("mouseout", handleMouseOut)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("mouseover", handleMouseOver)
      window.removeEventListener("mouseout", handleMouseOut)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [handleMouseMove, handleMouseOver, handleMouseOut])

  return (
    <div className="neon-cursor-container">

      {/* MAIN CURSOR */}
      <motion.div
        className="cursor-main"
        animate={{
          x: position.x - 6,
          y: position.y - 6,
          scale: isClicking ? 0.7 : isHovering ? 1.3 : 1,
        }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 400,
        }}
      />

      {/* CURSOR RING */}
      <motion.div
        className="cursor-trail"
        animate={{
          x: position.x - 20,
          y: position.y - 20,
          scale: isHovering ? 1.4 : 1,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 200,
        }}
      />

      {/* CURSOR GLOW */}
      <motion.div
        className="cursor-glow"
        animate={{
          x: position.x - 35,
          y: position.y - 35,
        }}
        transition={{
          type: "spring",
          damping: 40,
          stiffness: 150,
        }}
      />

    </div>
  )
}

export default NeonCursor
