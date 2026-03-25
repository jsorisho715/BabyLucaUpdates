'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { X } from 'lucide-react'

interface MediaViewerProps {
  url: string
  type: 'image' | 'video'
  onClose: () => void
}

export function MediaViewer({ url, type, onClose }: MediaViewerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>

      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw]"
      >
        {type === 'image' ? (
          <Image
            src={url}
            alt="Full size media"
            width={1920}
            height={1080}
            className="max-h-[90vh] w-auto rounded-lg object-contain"
            sizes="90vw"
            quality={100}
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
            playsInline
          />
        )}
      </motion.div>
    </motion.div>
  )
}
