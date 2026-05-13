"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Season {
  id: string
  name: string
  defaultMaxBidsPerTeam: number
  defaultBasePrice: number
}

export default function SeasonDefaultsPage() {
  const router = useRouter()
  const params = useParams()
  const seasonId = params.id as string

  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useSt