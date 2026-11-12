import { Microphone, VolumeUp } from "@strapi/icons";
import type { Editor } from "@tiptap/core";
import React, { useState, useRef, useEffect } from "react";
import { useIntl } from "react-intl";

import { ToolbarButton } from "../components/ToolbarButton";

interface SpeechRecognitionResultAlternative {
  transcript: string;
}

interface SpeechRecognitionResultEntry {
  isFinal: boolean;
  0: SpeechRecognitionResultAlternative;
}

interface SpeechRecognitionEventPayload {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultEntry>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventPayload) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/**
 * Provides Speech-to-Text (`SpeechRecognition`) and Text-to-Speech (`speechSynthesis`) toolbar controls
 * with an `aria-live="polite"` status announcer.
 */
export function useSpeechTools(
  editor: Editor | null,
  props: { disabled?: boolean } = { disabled: false }
) {
  const { formatMessage } = useIntl();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recognitionRef.current) {
        Object.assign(recognitionRef.current, {
          onresult: null,
          onerror: null,
          onend: null,
        });
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (utteranceRef.current) {
        Object.assign(utteranceRef.current, { onend: null, onerror: null });
        utteranceRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeechToText = () => {
    if (!editor) return;

    if (isListening && recognitionRef.current) {
      Object.assign(recognitionRef.current, {
        onresult: null,
        onerror: null,
        onend: null,
      });
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setLiveStatus(
        formatMessage({
          id: "tiptap-editor.speech.dictationStopped",
          defaultMessage: "Voice dictation stopped.",
        })
      );
      return;
    }

    const win =
      typeof window !== "undefined"
        ? (window as unknown as WindowWithSpeechRecognition)
        : null;
    const SpeechRecognitionCtor =
      win?.SpeechRecognition || win?.webkitSpeechRecognition || null;

    if (!SpeechRecognitionCtor) {
      setLiveStatus(
        formatMessage({
          id: "tiptap-editor.speech.notSupported",
          defaultMessage:
            "Speech recognition is not supported in this browser.",
        })
      );
      return;
    }

    try {
      const recognition: SpeechRecognitionInstance =
        new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang =
        (typeof document !== "undefined" && document.documentElement.lang) ||
        "en-US";

      const handleResult = (event: SpeechRecognitionEventPayload) => {
        if (!mountedRef.current || recognitionRef.current !== recognition)
          return;
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        const trimmed = transcript.trim();
        if (trimmed) {
          const { from } = editor.state.selection;
          const prevChar =
            from > 1 ? editor.state.doc.textBetween(from - 1, from, "") : "";
          const needsLeadingSpace = Boolean(prevChar && !/\s/.test(prevChar));
          editor
            .chain()
            .focus()
            .insertContent(`${needsLeadingSpace ? " " : ""}${trimmed}`)
            .run();
        }
      };

      const handleError = () => {
        if (!mountedRef.current || recognitionRef.current !== recognition)
          return;
        recognitionRef.current = null;
        setIsListening(false);
        setLiveStatus(
          formatMessage({
            id: "tiptap-editor.speech.dictationError",
            defaultMessage: "Voice dictation encountered an error.",
          })
        );
      };

      const handleEnd = () => {
        if (!mountedRef.current || recognitionRef.current !== recognition)
          return;
        recognitionRef.current = null;
        setIsListening(false);
        setLiveStatus(
          formatMessage({
            id: "tiptap-editor.speech.dictationStopped",
            defaultMessage: "Voice dictation stopped.",
          })
        );
      };

      Object.assign(recognition, {
        onresult: handleResult,
        onerror: handleError,
        onend: handleEnd,
      });

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setLiveStatus(
        formatMessage({
          id: "tiptap-editor.speech.dictationStarted",
          defaultMessage: "Voice dictation started. Speak now.",
        })
      );
    } catch {
      setIsListening(false);
    }
  };

  const toggleTextToSpeech = () => {
    if (!editor || typeof window === "undefined" || !window.speechSynthesis)
      return;

    if (isSpeaking) {
      if (utteranceRef.current) {
        Object.assign(utteranceRef.current, { onend: null, onerror: null });
        utteranceRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setLiveStatus(
        formatMessage({
          id: "tiptap-editor.speech.readAloudStopped",
          defaultMessage: "Read aloud stopped.",
        })
      );
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText =
      from !== to
        ? editor.state.doc.textBetween(from, to, " ")
        : editor.getText();

    if (!selectedText.trim()) return;

    if (utteranceRef.current) {
      Object.assign(utteranceRef.current, { onend: null, onerror: null });
      utteranceRef.current = null;
    }

    const utterance = new SpeechSynthesisUtterance(selectedText);
    utteranceRef.current = utterance;
    Object.assign(utterance, {
      onend: () => {
        if (!mountedRef.current || utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setIsSpeaking(false);
        setLiveStatus(
          formatMessage({
            id: "tiptap-editor.speech.readAloudCompleted",
            defaultMessage: "Read aloud completed.",
          })
        );
      },
      onerror: () => {
        if (!mountedRef.current || utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setIsSpeaking(false);
      },
    });

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setLiveStatus(
      formatMessage({
        id: "tiptap-editor.speech.readingAloud",
        defaultMessage: "Reading content aloud.",
      })
    );
  };

  const speechToTextButton = (
    <ToolbarButton
      onClick={toggleSpeechToText}
      icon={<Microphone />}
      active={isListening}
      toggle
      disabled={props.disabled || !editor}
      tooltip={
        isListening
          ? formatMessage({
              id: "tiptap-editor.toolbar.speechToText.stop",
              defaultMessage: "Stop voice dictation",
            })
          : formatMessage({
              id: "tiptap-editor.toolbar.speechToText.start",
              defaultMessage: "Voice dictation (Speech-to-Text)",
            })
      }
    />
  );

  const textToSpeechButton = (
    <ToolbarButton
      onClick={toggleTextToSpeech}
      icon={<VolumeUp />}
      active={isSpeaking}
      toggle
      disabled={props.disabled || !editor}
      tooltip={
        isSpeaking
          ? formatMessage({
              id: "tiptap-editor.toolbar.textToSpeech.stop",
              defaultMessage: "Stop reading aloud",
            })
          : formatMessage({
              id: "tiptap-editor.toolbar.textToSpeech.start",
              defaultMessage: "Read aloud (Text-to-Speech)",
            })
      }
    />
  );

  const speechLiveRegion = (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {liveStatus}
    </div>
  );

  return {
    isListening,
    isSpeaking,
    speechToTextButton,
    textToSpeechButton,
    speechLiveRegion,
  };
}
