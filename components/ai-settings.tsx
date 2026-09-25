"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const KEY_STORAGE =
  "meal-planner-gemini-api-key"

const MODEL_STORAGE =
  "meal-planner-gemini-model"

type AISettingsProps = {
  open: boolean
  onClose: () => void
}

export function AISettings({
  open,
  onClose,
}: AISettingsProps) {
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] =
    useState("gemini-3.5-flash-lite")

  const [showKey, setShowKey] =
    useState(false)

  const [testing, setTesting] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")

  useEffect(() => {
    if (!open) return

    const savedKey =
      window.sessionStorage.getItem(
        KEY_STORAGE,
      )

    const savedModel =
      window.sessionStorage.getItem(
        MODEL_STORAGE,
      )

    setApiKey(savedKey ?? "")

    setModel(
      savedModel ??
        "gemini-3.5-flash-lite",
    )

    setMessage("")
    setError("")
  }, [open])

  if (!open) {
    return null
  }

  function saveSettings() {
    setError("")
    setMessage("")

    const trimmed = apiKey.trim()

    if (!trimmed) {
      setError(
        "Please enter your Gemini API key.",
      )
      return
    }

    window.sessionStorage.setItem(
      KEY_STORAGE,
      trimmed,
    )

    window.sessionStorage.setItem(
      MODEL_STORAGE,
      model,
    )

    setMessage(
      "Gemini settings saved for this browser session.",
    )
  }

  async function testConnection() {
    setError("")
    setMessage("")

    const trimmed = apiKey.trim()

    if (!trimmed) {
      setError(
        "Enter your Gemini API key first.",
      )
      return
    }

    setTesting(true)

    try {
      const response = await fetch(
        "/api/ai",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "test",
            apiKey: trimmed,
            model,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Gemini connection failed.",
        )
      }

      setMessage(
        "Gemini connection works.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gemini connection failed.",
      )
    } finally {
      setTesting(false)
    }
  }

  function clearKey() {
    window.sessionStorage.removeItem(
      KEY_STORAGE,
    )

    window.sessionStorage.removeItem(
      MODEL_STORAGE,
    )

    setApiKey("")
    setMessage(
      "Gemini API key removed from this browser session.",
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Gemini AI Settings
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Bring your own Gemini API key.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Gemini API key
            </label>

            <div className="relative">
              <Input
                type={
                  showKey
                    ? "text"
                    : "password"
                }
                value={apiKey}
                onChange={(event) =>
                  setApiKey(
                    event.target.value,
                  )
                }
                placeholder="Paste your Gemini API key"
                className="pr-11"
              />

              <button
                type="button"
                onClick={() =>
                  setShowKey(
                    (current) =>
                      !current,
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground"
                aria-label={
                  showKey
                    ? "Hide API key"
                    : "Show API key"
                }
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              The key is kept only in this
              browser session and is sent to
              the app's server route when you
              use Gemini. It is not saved in
              Supabase.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Gemini model
            </label>

            <select
              value={model}
              onChange={(event) =>
                setModel(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="gemini-3.5-flash-lite">
                Gemini 3.5 Flash Lite
              </option>

            </select>
          </div>

          {message && (
            <p className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={testing}
            >
              {testing
                ? "Testing…"
                : "Test connection"}
            </Button>

            <Button
              type="button"
              onClick={saveSettings}
            >
              Save
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-destructive"
            onClick={clearKey}
          >
            Remove API key
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function getGeminiSettings() {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      apiKey: "",
      model: "gemini-3.5-flash-lite",
    }
  }

  return {
    apiKey:
      window.sessionStorage.getItem(
        KEY_STORAGE,
      ) ?? "",

    model:
      window.sessionStorage.getItem(
        MODEL_STORAGE,
      ) ??
      "gemini-3.5-flash-lite",
  }
}