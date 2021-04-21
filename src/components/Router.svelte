<script>
  /**Renderless component to act as a simple router using the History API
   *On browser load, parse the url and extract parameters
   */

  import {
      loginWithGithub,
      refreshTokenWithGithub,
  } from "../request/githubApi";
  import {githubStore} from "../store/store.js";

  window.onload = function () {
    console.log(window.location);
    if (window.location.search.length > 0) {
      var searchParams = new URLSearchParams(window.location.search);
      searchParams.forEach((value, key) => {
        console.log(`Parameter of ${key} is ${value} `);
      });
      if (searchParams.has("code")) {
          $githubStore.githubName = "";
          $githubStore.access_token = "";
          $githubStore.refresh_token = "";
          $githubStore.expires_in = 0;
          $githubStore.refresh_token_expires_in = 0;
          window.localStorage.setItem(
              "githubStore",
              JSON.stringify($githubStore)
          );
          loginWithGithub({
              code: searchParams.get("code"),
          })
              .then((respone) => {
                  console.log(respone);
                  if (respone.access_token) {
                      $githubStore.githubName = respone.githubName;
                      $githubStore.access_token = respone.access_token;
                      $githubStore.refresh_token = respone.refresh_token;
                      $githubStore.expires_in = respone.expires_in * 1000 + Date.now();
                      $githubStore.refresh_token_expires_in =
                          respone.refresh_token_expires_in * 1000 + Date.now();
                      window.localStorage.setItem(
                          "githubStore",
                          JSON.stringify($githubStore)
                      );
                      if (!respone.nenoinkId) {
                          window.location.replace(
                              "https://github.com/apps/nenoink/installations/new"
                          );
                          return;
              }
            }

            window.location.replace(window.location.origin);
          })
          .catch((reason) => {
            console.log(reason);
          });
      }
    } else if (
        $githubStore.expires_in < Date.now() &&
        $githubStore.refresh_token

    ) {
        //尝试刷新token
        {
            refreshTokenWithGithub({
                refresToken: $githubStore.refresh_token,
            }).then((respone) => {
                console.log(respone);
                if (respone.body.access_token) {
                    if (respone.body.nenoinkId == "") {
              window.location.replace(
                "https://github.com/apps/nenoink/installations/new"
              );
              return;
            }
          } else {
            //重新授权
            // window.location.replace(
            //   "https://github.com/login/oauth/authorize?response_type=code&client_id=Iv1.a9367867a9a251d8"
            // );
          }
        });
      }
    }
  };

  /**
   * Handle broswer back events here
   */
  window.onpopstate = function (event) {
    if (event.state) {
    }
  };
</script>
