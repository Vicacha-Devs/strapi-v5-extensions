import {
  TextInput,
  Dialog,
  Button,
  Field,
  Flex,
  Typography,
} from "@strapi/design-system";
import { Microphone } from "@strapi/icons";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import React, { useState, useRef, useEffect } from "react";
import { useIntl } from "react-intl";

import { isSafeUrl } from "../../../shared/src/contentSerializer";
import {
  MediaLibraryWrapper,
  type StrapiFile,
} from "../components/MediaLibraryWrapper";
import { ToolbarButton } from "../components/ToolbarButton";
import { uploadFileToStrapi } from "../utils/strapiApp";

/**
 * Provides toolbar button and dialog for inserting audio from the Strapi Media Library,
 * external URL, or in-browser MediaRecorder voice recording (uploaded to `/upload`).
 */
export function useAudio(
  editor: Editor | null,
  props: { disabled?: boolean } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioCaption, setAudioCaption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedDataUrl, setRecordedDataUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mountedRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isInCodeBlock: ctx.editor?.isActive("codeBlock") ?? false,
    }),
  });

  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
    streamRef.current = null;
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopStreamTracks();
    if (mountedRef.current) {
      setIsRecording(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
      }
      stopRecording();
      mediaRecorderRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    setRecordingError(null);
    setRecordedDataUrl(null);
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
    stopStreamTracks();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setRecordingError(
        formatMessage({
          id: "tiptap-editor.audio.notSupported",
          defaultMessage: "Audio recording is not supported in this browser.",
        })
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopStreamTracks();
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordedBlobRef.current = blob;
        const reader = new FileReader();
        reader.onloadend = () => {
          if (mountedRef.current && typeof reader.result === "string") {
            setRecordedDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      if (!mountedRef.current) {
        stopRecording();
        return;
      }
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        if (mountedRef.current) {
          setRecordingSeconds((s) => s + 1);
        }
      }, 1000);
    } catch {
      stopStreamTracks();
      if (mountedRef.current) {
        setRecordingError(
          formatMessage({
            id: "tiptap-editor.audio.micDenied",
            defaultMessage: "Microphone permission denied or unavailable.",
          })
        );
      }
    }
  };

  const handleSelectAssets = (assets: StrapiFile[]) => {
    const asset = assets[0];
    const src = asset?.url?.trim();
    if (!asset || !editor || !src || !isSafeUrl(src)) {
      setShowMediaLibrary(false);
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "audio",
        attrs: {
          src,
          "title": asset.name ?? asset.alternativeText ?? "",
          "caption": asset.caption ?? null,
          "mime": asset.mime ?? "audio/mpeg",
          "data-asset-id": asset.id ?? null,
          "data-document-id": asset.documentId ?? null,
        },
      })
      .createParagraphNear()
      .run();

    setShowMediaLibrary(false);
  };

  const handleInsertUrlOrRecording = async () => {
    if (!editor) return;

    // Upload recorded Blob to Strapi Media Library (/upload) when available
    if (
      !audioUrl.trim() &&
      recordedBlobRef.current &&
      typeof FormData !== "undefined"
    ) {
      try {
        setIsUploading(true);
        const ext = recordedBlobRef.current.type.includes("ogg")
          ? "ogg"
          : "webm";
        const filename = `voice-recording-${Date.now()}.${ext}`;
        const formData = new FormData();
        formData.append("files", recordedBlobRef.current, filename);
        const uploadedFile = await uploadFileToStrapi(formData);
        if (!mountedRef.current) return;

        const uploadErrorMsg = formatMessage({
          id: "tiptap-editor.audio.uploadError",
          defaultMessage: "Failed to upload recording. Please try again.",
        });
        if (!uploadedFile?.url || !isSafeUrl(uploadedFile.url)) {
          setRecordingError(uploadErrorMsg);
          return;
        }

        editor
          .chain()
          .focus()
          .insertContent({
            type: "audio",
            attrs: {
              "src": uploadedFile.url,
              "title":
                audioCaption.trim() ||
                formatMessage({
                  id: "tiptap-editor.audio.defaultTitle",
                  defaultMessage: "Voice Recording",
                }),
              "caption": audioCaption.trim() || null,
              "mime":
                uploadedFile.mime ||
                recordedBlobRef.current.type ||
                "audio/webm",
              "data-asset-id":
                typeof uploadedFile.id === "number" ? uploadedFile.id : null,
              "data-document-id":
                typeof uploadedFile.documentId === "string"
                  ? uploadedFile.documentId
                  : null,
            },
          })
          .createParagraphNear()
          .run();

        setAudioUrl("");
        setAudioCaption("");
        setRecordedDataUrl(null);
        recordedBlobRef.current = null;
        setShowAudioDialog(false);
        return;
      } catch {
        if (mountedRef.current) {
          setRecordingError(
            formatMessage({
              id: "tiptap-editor.audio.uploadError",
              defaultMessage: "Failed to upload recording. Please try again.",
            })
          );
        }
        return;
      } finally {
        if (mountedRef.current) setIsUploading(false);
      }
    }

    const finalSrc = audioUrl.trim();
    if (!finalSrc || !isSafeUrl(finalSrc)) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "audio",
        attrs: {
          src: finalSrc,
          title:
            audioCaption.trim() ||
            formatMessage({
              id: "tiptap-editor.audio.defaultAudioTitle",
              defaultMessage: "Audio",
            }),
          caption: audioCaption.trim() || null,
        },
      })
      .createParagraphNear()
      .run();

    setAudioUrl("");
    setAudioCaption("");
    setRecordedDataUrl(null);
    recordedBlobRef.current = null;
    setShowAudioDialog(false);
  };

  const audioButton = (
    <ToolbarButton
      onClick={() => setShowAudioDialog(true)}
      icon={<Microphone />}
      active={false}
      tint="rose"
      disabled={
        props.disabled || !editor || (editorState?.isInCodeBlock ?? false)
      }
      tooltip={formatMessage({
        id: "tiptap-editor.toolbar.insertAudio",
        defaultMessage: "Insert or record audio",
      })}
    />
  );

  const audioDialog = (
    <>
      <Dialog.Root
        open={showAudioDialog}
        onOpenChange={(open: boolean) => {
          if (!open) stopRecording();
          setShowAudioDialog(open);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            {formatMessage({
              id: "tiptap-editor.audio.dialogTitle",
              defaultMessage: "Insert or Record Audio",
            })}
          </Dialog.Header>
          <Dialog.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Button
                variant="secondary"
                onClick={() => {
                  stopRecording();
                  setShowAudioDialog(false);
                  setShowMediaLibrary(true);
                }}
              >
                {formatMessage({
                  id: "tiptap-editor.audio.chooseFromLibrary",
                  defaultMessage: "Choose Audio from Media Library",
                })}
              </Button>

              <Flex
                direction="column"
                gap={2}
                padding={3}
                background="neutral100"
                hasRadius
                alignItems="center"
              >
                <Typography variant="sigma">
                  {formatMessage({
                    id: "tiptap-editor.audio.voiceRecorderTitle",
                    defaultMessage: "In-Browser Voice Recorder",
                  })}
                </Typography>
                {isRecording ? (
                  <Flex gap={2} alignItems="center">
                    <Typography variant="omega" textColor="danger600">
                      ●{" "}
                      {formatMessage(
                        {
                          id: "tiptap-editor.audio.recordingStatus",
                          defaultMessage: "Recording... {time}",
                        },
                        {
                          time: `${Math.floor(recordingSeconds / 60)}:${String(
                            recordingSeconds % 60
                          ).padStart(2, "0")}`,
                        }
                      )}
                    </Typography>
                    <Button variant="danger" size="S" onClick={stopRecording}>
                      {formatMessage({
                        id: "tiptap-editor.audio.stopRecording",
                        defaultMessage: "Stop",
                      })}
                    </Button>
                  </Flex>
                ) : (
                  <Button
                    variant="tertiary"
                    size="S"
                    startIcon={<Microphone />}
                    onClick={startRecording}
                  >
                    {formatMessage({
                      id: "tiptap-editor.audio.startRecording",
                      defaultMessage: "Start Recording",
                    })}
                  </Button>
                )}
                {recordedDataUrl && (
                  <audio
                    src={recordedDataUrl}
                    controls
                    style={{ width: "100%" }}
                  />
                )}
                {recordingError && (
                  <Typography variant="pi" textColor="danger600">
                    {recordingError}
                  </Typography>
                )}
              </Flex>

              <Field.Root name="audioUrl">
                <Field.Label>
                  {formatMessage({
                    id: "tiptap-editor.audio.urlLabel",
                    defaultMessage: "Or External Audio URL (MP3, WAV, OGG)",
                  })}
                </Field.Label>
                <TextInput
                  placeholder="https://example.com/podcast.mp3"
                  value={audioUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAudioUrl(e.target.value)
                  }
                />
              </Field.Root>

              <Field.Root name="audioCaption">
                <Field.Label>
                  {formatMessage({
                    id: "tiptap-editor.audio.captionLabel",
                    defaultMessage: "Caption (optional)",
                  })}
                </Field.Label>
                <TextInput
                  value={audioCaption}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAudioCaption(e.target.value)
                  }
                />
              </Field.Root>
            </Flex>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button
                variant="tertiary"
                onClick={() => {
                  stopRecording();
                  setShowAudioDialog(false);
                }}
              >
                {formatMessage({
                  id: "tiptap-editor.audio.cancel",
                  defaultMessage: "Cancel",
                })}
              </Button>
            </Dialog.Cancel>
            <Button
              onClick={handleInsertUrlOrRecording}
              disabled={(!recordedDataUrl && !audioUrl.trim()) || isUploading}
              loading={isUploading}
            >
              {formatMessage({
                id: "tiptap-editor.audio.insert",
                defaultMessage: "Insert Audio",
              })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>

      <MediaLibraryWrapper
        open={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelectAssets={handleSelectAssets}
        allowedTypes={["audios"]}
      />
    </>
  );

  return { audioButton, audioDialog };
}
