/*
The MIT License

Copyright (c) 2009 Chris Wanstrath (Ruby)
Copyright (c) 2010-2014 Jan Lehnardt (JavaScript)
Copyright (c) 2010-2015 The mustache.js community

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const assert = require('chai').assert
var Scanner = require('../../lib/templating/scanner');

describe('A new Mustache.Scanner', function () {
  describe('for an empty string', function () {
    it('is at the end', function () {
      var scanner = new Scanner('');
      assert(scanner.eos());
    });
  });

  describe('for a non-empty string', function () {
    var scanner;
    beforeEach(function () {
      scanner = new Scanner('a b c');
    });

    describe('scan', function () {
      describe('when the RegExp matches the entire string', function () {
        it('returns the entire string', function () {
          var match = scanner.scan(/a b c/);
          assert.equal(match, scanner.string);
          assert(scanner.eos());
        });
      });

      describe('when the RegExp matches at index 0', function () {
        it('returns the portion of the string that matched', function () {
          var match = scanner.scan(/a/);
          assert.equal(match, 'a');
          assert.equal(scanner.pos, 1);
        });
      });

      describe('when the RegExp matches at some index other than 0', function () {
        it('returns the empty string', function () {
          var match = scanner.scan(/b/);
          assert.equal(match, '');
          assert.equal(scanner.pos, 0);
        });
      });

      describe('when the RegExp does not match', function () {
        it('returns the empty string', function () {
          var match = scanner.scan(/z/);
          assert.equal(match, '');
          assert.equal(scanner.pos, 0);
        });
      });
    }); // scan

    describe('scanUntil', function () {
      describe('when the RegExp matches at index 0', function () {
        it('returns the empty string', function () {
          var match = scanner.scanUntil(/a/);
          assert.equal(match, '');
          assert.equal(scanner.pos, 0);
        });
      });

      describe('when the RegExp matches at some index other than 0', function () {
        it('returns the string up to that index', function () {
          var match = scanner.scanUntil(/b/);
          assert.equal(match, 'a ');
          assert.equal(scanner.pos, 2);
        });
      });

      describe('when the RegExp does not match', function () {
        it('returns the entire string', function () {
          var match = scanner.scanUntil(/z/);
          assert.equal(match, scanner.string);
          assert(scanner.eos());
        });
      });
    }); // scanUntil
  }); // for a non-empty string
});