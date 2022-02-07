<script>
  /**Renderless component to act as a simple router using the History API
   *On browser load, parse the url and extract parameters
   */



  window.onload = function () {
    console.log(window.location);
    if (window.location.search.length > 0) {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.forEach((value, key) => {
        console.log(`Parameter of ${key} is ${value} `);
      });

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
