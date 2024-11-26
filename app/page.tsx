"use client"

import React, { useEffect, useState, useRef } from "react"
import io, { Socket } from "socket.io-client"
import MarkdownIt from "markdown-it"
import { v4 as uuidv4 } from "uuid"

const mdParser = new MarkdownIt()
const userId = uuidv4()

const Home: React.FC = () => {
  const [docId] = useState("default-doc")
  const [content, setContent] = useState("")
  const [htmlPreview, setHtmlPreview] = useState("")
  const [cursors, setCursors] = useState<{ [userId: string]: number }>({})
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io("http://localhost:3000")
    socketRef.current = socket

    socket.emit("join-document", { docId })

    socket.on("document-content", (data) => {
      setContent(data.content)
      setHtmlPreview(mdParser.render(data.content))
    })

    socket.on("document-updated", (data) => {
      setContent(data.content)
      setHtmlPreview(mdParser.render(data.content))
    })

    socket.on("cursor-updated", (data) => {
      setCursors((prevCursors) => ({
        ...prevCursors,
        [data.userId]: data.cursorPosition,
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [docId])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const renderedHTML = mdParser.render(newContent)
    setContent(newContent)
    setHtmlPreview(renderedHTML)

    socketRef.current?.emit("edit-document", { docId, content: newContent })
  }

  const handleCursorMove = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const cursorPosition = e.currentTarget.selectionStart
    socketRef.current?.emit("cursor-move", { docId, userId, cursorPosition })
  }

  const renderCursors = () => {
    if (!textareaRef.current) return null

    const textarea = textareaRef.current
    const cursorElements = Object.entries(cursors).map(([key, pos]) => {
      const textBeforeCursor = textarea.value.slice(0, pos)
      const lines = textBeforeCursor.split("\n")
      const top = lines.length - 1
      const left = lines[lines.length - 1].length
      return (
        <div
          key={key}
          style={{
            position: "absolute",
            top: `${top * 1.5}em`,
            left: `${left * 0.6}em`,
            backgroundColor: "red",
            width: "2px",
            height: "1em",
          }}
        />
      )
    })
    return <div style={{ position: "relative" }}>{cursorElements}</div>
  }

  return (
    <div
      style={{ backgroundColor: "#1e1e1e", height: "100vh", color: "#ffffff" }}
    >
      {/* 상단 타이틀 바 */}
      <div
        style={{
          backgroundColor: "#333333",
          padding: "15px",
          fontSize: "20px",
          fontWeight: "bold",
          color: "#ffffff",
          textAlign: "center",
          borderBottom: "2px solid #444444",
        }}
      >
        hoonapps
      </div>

      {/* 본문 영역 */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: "calc(100% - 50px)",
        }}
      >
        {/* Markdown 입력 */}
        <div style={{ position: "relative", width: "50%" }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyUp={handleCursorMove}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#282c34",
              color: "#ffffff",
              border: "none",
              outline: "none",
              padding: "15px",
              fontSize: "16px",
              fontFamily: "monospace",
              resize: "none",
            }}
          />
          {renderCursors()}
        </div>

        {/* HTML 미리보기 */}
        <div
          className="markdown-preview"
          style={{
            width: "50%",
            height: "100%",
            padding: "15px",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            overflowY: "scroll",
            fontFamily: "Arial, sans-serif",
            lineHeight: "1.6",
          }}
          dangerouslySetInnerHTML={{ __html: htmlPreview }}
        />
      </div>
    </div>
  )
}

export default Home
