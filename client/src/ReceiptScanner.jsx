import { useEffect, useRef, useState } from "react";
import { FileImage, ScanLine } from "lucide-react";
import { parseReceiptText } from "./receiptParser.js";
import "./ReceiptScanner.css";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function ReceiptScanner({ onExtract }) {
  const inputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const scanReceipt = async file => {
    setError("");
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP receipt image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Receipt images must be 8 MB or smaller.");
      return;
    }

    const nextImageUrl = URL.createObjectURL(file);
    setImageUrl(currentUrl => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextImageUrl;
    });
    setStatus("Loading OCR…");
    setProgress(0);

    let worker;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        logger: message => {
          if (message.status === "recognizing text") {
            setStatus("Reading receipt…");
            setProgress(Math.round(message.progress * 100));
          }
        }
      });
      const result = await worker.recognize(file);
      const fields = parseReceiptText(result.data.text);
      onExtract(fields);
      setProgress(100);
      setStatus("Review the detected values below. You can edit any field before saving.");
      if (!fields.title && !fields.amount && !fields.date) {
        setError("We couldn't identify receipt details. Enter them manually or try a clearer image.");
      }
    } catch (scanError) {
      setStatus("");
      setError(scanError.message || "OCR couldn't read this image. Please try another receipt.");
    } finally {
      await worker?.terminate();
    }
  };

  return (
    <section className="receipt-scanner" aria-label="Receipt scanner">
      <div className="receipt-scan-copy">
        <span className="receipt-scan-icon"><ScanLine size={18} /></span>
        <div><strong>Scan a receipt</strong><p>Read merchant, amount, and date from an image.</p></div>
        <button className="secondary-button receipt-upload-button" type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(status && progress < 100)}>
          <FileImage size={16} /> Choose image
        </button>
      </div>
      <input ref={inputRef} className="receipt-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => scanReceipt(event.target.files?.[0])} />
      {imageUrl && <img className="receipt-preview" src={imageUrl} alt="Selected receipt preview" />}
      {status && <p className="receipt-scan-status" role="status">{status}{progress > 0 && progress < 100 ? ` ${progress}%` : ""}</p>}
      {error && <p className="receipt-scan-error" role="alert">{error}</p>}
      <small className="receipt-privacy">OCR runs in your browser; the image is not uploaded to the server.</small>
    </section>
  );
}

export default ReceiptScanner;
