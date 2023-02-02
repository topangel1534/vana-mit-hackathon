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

  // Image-to-Text State
  const [imageUrl, setImageUrl] = useState(null);
  const [imageText, setImageText] = useState("");

  // Text-to-Image State
  // const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const prompt = imageText
    ? `a portrait of {target_token} in the style of ${imageText}`
    : "Prompt not ready";

  const callTextToImageAPI = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      console.log("About to call API");
      const urls = await vanaApiPost(`images/generations`, {
        prompt: prompt,
        n: 4,
      });
      setGeneratedImages(urls);
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
          // clip_model_name: "ViT-H-14/laion2b_s32b_b79k",
          clip_model_name: "ViT-L-14/openai",
          image: images[0].fileUrl,
          mode: "fast",
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
    setImageText(multi.output);
  };

  return (
    <>
      <Head>
        <title>Portraits from Images</title>
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
                      Upload an image to mix with your portrait...
                    </button>
                  )}
                </UploadButton>
                <div className="image-viewer">
                  {imageUrl && (
                    <>
                      <img src={imageUrl} alt="Uploaded Image" />
                      <div className="progressContainer animateProgress">
                        <div className="progressBar" />
                      </div>
                      <div className="uploaded-image-detail">
                        <div className="caption">
                          Uploaded Image Description
                        </div>
                        <div className="description">
                          {prediction && prediction.status === "succeeded" ? (
                            imageText
                          ) : (
                            <div className="progressContainer animateProgress">
                              <div className="progressBar" />
                            </div>
                          )}
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
                        ? `${prompt}`
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
              </div>

              {/** Show the images a user has created */}
              <div className="pt-1 space-y-4">
                {generatedImages?.data?.map((image, i) => (
                  <img src={image.url} key={i} className="w-full" />
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
