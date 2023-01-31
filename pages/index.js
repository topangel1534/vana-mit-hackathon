import { useState, useEffect } from "react";
import Head from "next/head";
import { GithubIcon } from "components/icons/GithubIcon";
import { vanaApiPost } from "vanaApi";
import { LoginHandler } from "components/auth/LoginHandler";
import { Uploader } from "uploader";
import { UploadButton } from "react-uploader";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const uploader = Uploader({
  apiKey: "free",
});

const options = { multi: false };

export default function Home() {
  // User State
  const [user, setUser] = useState({
    balance: 0,
    exhibits: [],
    textToImage: [],
  });

  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  //Image-to-Text State
  const [imageUrl, setImageUrl] = useState(null);
  const [imageText, setTextOfImage] = useState("");
  // Text-to-Image State
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const callTextToImageAPI = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await vanaApiPost(`jobs/text-to-image`, {
        prompt: imageText.replace(/\bme\b/i, "{target_token}"), // Replace the word "me" with "{target_token}" in the prompt to include yourself in the picture
        exhibit_name: "text-to-image", // How your images are grouped in your gallery. For this demo, all images will be grouped in the `text-to-image` exhibit
        n_samples: 5,
        seed: -1, // The inference seed: A non-negative integer fixes inference so inference on the same (model, prompt) produces the same output
      });
      alert(
        "Successfully submitted prompt. New images will appear in about 7 minutes."
      );
    } catch (error) {
      setErrorMessage("An error occurred while generating the image");
    }

    setIsLoading(false);
  };

  const handleComplete = async (images) => {
    setImageUrl(images[0].fileUrl);
    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          clip_model_name: "ViT-L-14/openai",
          image: images[0].fileUrl,
          mode: "best",
        },
      }),
    });
    let multi = await response.json();
    setPrediction(multi);
    const predictionId = multi.uuid;
    if (response.status !== 201) {
      setError(multi.detail);
      return;
    }
    while (multi.status !== "succeeded" && multi.status !== "failed") {
      await sleep(1000);
      const response = await fetch("/api/predictions/" + predictionId);
      const { prediction } = await response.json();
      multi = prediction;
      if (response.status !== 200) {
        setError(multi.detail);
        return;
      }
      setPrediction(prediction);
    }
    setTextOfImage(multi.output);
  };

  return (
    <>
      <Head>
        <title>Vana MIT Hackathon</title>
        <meta name="description" content="Vana MIT Hackathon" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="header">
        <a
          href="https://github.com/vana-com/vana-mit-hackathon"
          target="_blank"
        >
          <GithubIcon />
        </a>
      </header>
      <main className="main">
        <LoginHandler setUser={setUser}>
          {user.exhibits.length > 0 && (
            <div className="content container">
              <div className="image-uploader-form">
                <UploadButton
                  uploader={uploader}
                  options={options}
                  onComplete={handleComplete}
                >
                  {({ onClick }) => (
                    <button className="image-upload" onClick={onClick}>
                      Upload a file...
                    </button>
                  )}
                </UploadButton>
                <div className="image-viewer">
                  {imageUrl && (
                    <>
                      <img src={imageUrl} alt="Uploaded Image" />
                      <div className="uploaded-image-detail">
                        <div className="caption">
                          Uploaded Image Description
                        </div>
                        <div className="description">
                          {prediction && prediction.status === "succeeded"
                            ? imageText
                            : "Loading..."}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {imageText && (
                  <>
                    <label htmlFor="prompt-input">Prompt:</label>
                    <div className="image-prompt">
                      {prediction && prediction.status === "succeeded"
                        ? `me ${imageText}`
                        : "Loading..."}
                    </div>
                    <form onSubmit={callTextToImageAPI}>
                      <button type="submit">Generate image</button>
                    </form>
                  </>
                )}
                <div>Credit balance: {user?.balance ?? 0}</div>

                {isLoading && <p>Loading...</p>}
                {errorMessage && <p>Error: {errorMessage}</p>}

                <div>
                  <p>
                    Tip: make sure to include the word "me" in your prompt to
                    include your face
                  </p>
                </div>
              </div>

              {/** Show the images a user has created */}
              <div className="pt-1 space-y-4">
                {user?.textToImage?.map((image, i) => (
                  <img src={image} key={i} className="w-full" />
                ))}
              </div>
            </div>
          )}

          {/* User doesn't have a trained model*/}
          {user.exhibits.length === 0 && (
            <p>
              Unfortunately, you haven't created a personalized Vana Portrait
              model yet. Go to https://portrait.vana.com/create to create one 🙂
            </p>
          )}
        </LoginHandler>
      </main>
    </>
  );
}
