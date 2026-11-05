/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Box, Button, Flex, Text } from "@theme-ui/components";
import { AudioAttachment } from "../attachment/types.js";
import { useRef, useState, useEffect } from "react";
import { Icon } from "@notesnook/ui";
import { Icons } from "../../toolbar/icons.js";
import { ReactNodeViewProps } from "../react/index.js";
import { ToolbarGroup } from "../../toolbar/components/toolbar-group.js";
import { DesktopOnly } from "../../components/responsive/index.js";
import { toBlobURL, revokeBloburl } from "../../utils/downloader.js";
import { formatBytes } from "@notesnook/common";
import { strings } from "@notesnook/intl";

const SAMPLE_AUDIO = toBlobURL(
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
  "other",
  "audio/wav",
  "sample-audio"
);

export function AudioComponent(props: ReactNodeViewProps<AudioAttachment>) {
  const { editor, node, selected } = props;
  const { filename, size, progress, mime, hash } = node.attrs;
  const elementRef = useRef<HTMLDivElement>();
  const [isDragging, setIsDragging] = useState(false);
  const isLoading = useRef(false);
  const [error, setError] = useState<string>();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(
    Array.from({ length: 24 }, () => 3)
  );
  const recorderRef = useRef<MediaRecorder>();
  const streamRef = useRef<MediaStream>();
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode>();
  const audioContextRef = useRef<AudioContext>();
  const intervalRef = useRef<number>();


  useEffect(() => {
    return () => {
      if (intervalRef.current !== undefined) {
        window.clearInterval(intervalRef.current);
      }
      recorderRef.current?.state !== "inactive" &&
        recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
      if (hash) revokeBloburl(hash);
    };
  }, [hash]);

  const formatElapsed = (seconds: number) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextConstructor) {
        const audioContext = new AudioContextConstructor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

      recorderRef.current = recorder;
      recorder.start(250);
      const startedAt = Date.now();
      setElapsed(0);
      setIsRecording(true);
      setError(undefined);
      intervalRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        const analyser = analyserRef.current;
        if (!analyser) return;
        const values = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(values);
        setWaveform(
          Array.from(values).slice(0, 24).map((value) => Math.max(3, value / 9))
        );
      }, 100);
    } catch (e) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = undefined;
      setError((e as Error).message);
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.addEventListener(
        "stop",
        () =>
          resolve(
            new Blob(chunksRef.current, {
              type: recorder.mimeType || "audio/webm"
            })
          ),
        { once: true }
      );
      recorder.stop();
    });

    if (intervalRef.current !== undefined) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    analyserRef.current = undefined;
    if (audioContextRef.current?.state !== "closed") {
      await audioContextRef.current?.close().catch(() => undefined);
    }
    audioContextRef.current = undefined;
    recorderRef.current = undefined;
    setIsRecording(false);

    if (!blob.size) {
      setError("The recording is empty. Please try again.");
      return;
    }

    try {
      const extension = blob.type.includes("mp4") ? "m4a" : "webm";
      const filename = `Voice memo ${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.${extension}`;
      const attachment = await editor.storage.saveAudioRecording?.(
        blob,
        filename
      );
      if (!attachment) {
        setError("Could not save the recording.");
        return;
      }
      props.updateAttributes(attachment);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Box
      ref={elementRef}
      contentEditable={false}
      draggable="false"
      sx={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        userSelect: "none",
        backgroundColor: "var(--background-secondary)",
        p: 1,
        borderRadius: "default",
        border: "1px solid var(--border)",
        borderColor: selected ? "accent" : "border",
        width: "100%",
        maxWidth: 500,
        ":hover": {
          backgroundColor: "var(--hover)"
        }
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      data-drag-handle
      data-drag-image
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2
        }}
      >
        <Icon path={Icons.attachment} size={16} />
        <Text
          as="span"
          sx={{
            ml: "small",
            fontSize: "body",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
            flex: 1
          }}
        >
          {filename || "Voice memo"}
        </Text>
        {hash ? (
          <Text
            as="span"
            sx={{
              ml: 1,
              fontSize: "0.65rem",
              color: "var(--paragraph-secondary)",
              flexShrink: 0
            }}
          >
            {progress ? `${progress}%` : formatBytes(size, 1)}
          </Text>
        ) : null}
      </Box>
      {!hash ? (
        <Flex sx={{ alignItems: "center", gap: 2, minHeight: 35 }}>
          {isRecording ? (
            <>
              <Text
                as="span"
                sx={{
                  color: "var(--icon-error)",
                  fontSize: "0.75rem",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0
                }}
              >
                ● {formatElapsed(elapsed)}
              </Text>
              <Flex
                aria-label="Live audio waveform"
                sx={{
                  alignItems: "center",
                  gap: "2px",
                  height: 28,
                  flex: 1,
                  overflow: "hidden"
                }}
              >
                {waveform.map((height, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: "3px",
                      height: `${height}px`,
                      borderRadius: "999px",
                      backgroundColor: "accent",
                      flex: "0 0 3px"
                    }}
                  />
                ))}
              </Flex>
              <Button
                variant="accent"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  void stopRecording();
                }}
                sx={{ flexShrink: 0 }}
              >
                Stop & Save
              </Button>
            </>
          ) : (
            <Button
              variant="accent"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void startRecording();
              }}
            >
              Record voice memo
            </Button>
          )}
          {error ? <Text variant="error">{error}</Text> : null}
        </Flex>
      ) : error ? (
        <Text variant="error">{error}</Text>
      ) : (
        <Box
          sx={{
            width: "100%",
            "& audio": {
              width: "100%",
              height: 35
            }
          }}
        >
          <audio
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            controls
            controlsList="nodownload nofullscreen"
            src={SAMPLE_AUDIO}
            onPause={(e) => {
              if (isLoading.current) {
                e.preventDefault();
              }
            }}
            onPlay={(e) => {
              const target = e.currentTarget;
              if (
                editor.storage?.getAttachmentData &&
                hash &&
                target.src === SAMPLE_AUDIO &&
                !isLoading.current
              ) {
                e.preventDefault();
                isLoading.current = true;
                editor.storage
                  .getAttachmentData({
                    type: "file",
                    hash
                  })
                  .then((data: string | undefined) => {
                    isLoading.current = false;
                    if (!data) return;
                    const url = toBlobURL(data, "other", mime, hash);
                    if (!url) return;
                    target.src = url;
                    return target.play();
                  })
                  .catch((e) => {
                    isLoading.current = false;
                    setError((e as Error).message);
                  });
              }
            }}
          >
            <Text as="p">{strings.browserAudioNotSupported()}</Text>
          </audio>
        </Box>
      )}
      <DesktopOnly>
        {hash && selected && !isDragging && (
          <ToolbarGroup
            editor={editor}
            groupId="audioTools"
            tools={
              editor.isEditable
                ? ["removeAttachment", "downloadAttachment"]
                : ["downloadAttachment"]
            }
            sx={{
              boxShadow: "menu",
              borderRadius: "default",
              backgroundColor: "var(--background)",
              position: "absolute",
              top: -35,
              right: 0
            }}
          />
        )}
      </DesktopOnly>
    </Box>
  );
}
