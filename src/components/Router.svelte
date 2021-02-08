<script>
  /**Renderless component to act as a simple router using the History API
   *On browser load, parse the url and extract parameters
   */
  window.onload = function() {
    if (window.location.search.length > 0) {
      const params = window.location.search.substr(1);
      params.split("&").forEach(param => {
        const key = param.split("=")[0];
        const value = parseFloat(param.split("=")[1]);
        console.log(`Parameter of ${key} is ${value}`);
      });
    }
  };

  /**
   * Handle broswer back events here
   */
  window.onpopstate = function(event) {
    if (event.state) {
    }
  };
</script>
