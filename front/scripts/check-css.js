import stylelint from 'stylelint';

async function checkCSS() {
  console.log('🔍 Checking CSS files for errors and outdated syntax...\n');

  try {
    const result = await stylelint.lint({
      files: 'css/**/*.css'
      // Note: Removed formatter: 'string' to rely on the default return structure
    });

    if (result.errored) {
      console.error('❌ CSS issues found:\n');

      // Loop through results and print warnings/errors explicitly
      result.results.forEach((fileResult) => {
        if (fileResult.warnings.length > 0) {
          console.log(`\n📄 ${fileResult.source}`);
          fileResult.warnings.forEach((warning) => {
            console.log(
              `  └─ [Line ${warning.line}, Col ${warning.column}] ${warning.text} (${warning.rule})`
            );
          });
        }
      });

      process.exit(1);
    } else {
      console.log('✅ All CSS files are up to date and error-free!');
    }
  } catch (err) {
    console.error('An error occurred while checking CSS:', err);
    process.exit(1);
  }
}

checkCSS();